"""
Screener service — data logic for all specialized screeners
Provides: scalping signals, grid zones, basis/premium, low-liq alpha
"""
import asyncio
import time
import statistics
from typing import List, Dict, Optional
from app.services.exchange_clients import (
    BinanceClient, BybitClient, MexcClient, GateClient,
    AstradexClient, HyperliquidClient
)


CLIENTS = {
    'binance': BinanceClient,
    'bybit': BybitClient,
    'mexc': MexcClient,
    'gate': GateClient,
    'astradex': AstradexClient,
    'hyperliquid': HyperliquidClient,
}

_initialized_clients: Dict = {}
_client_lock = asyncio.Lock()


async def _get_clients() -> Dict:
    """Lazy-initialize and return exchange clients"""
    global _initialized_clients
    async with _client_lock:
        if not _initialized_clients:
            for name, cls in CLIENTS.items():
                try:
                    client = cls()
                    await client.initialize()
                    _initialized_clients[name] = client
                    print(f"✅ Screener: {name} client ready")
                except Exception as e:
                    print(f"⚠️ Screener: {name} init failed: {e}")
    return _initialized_clients


def _calc_signal(cvd: float, ob_imbalance: float, vol_spike: float) -> str:
    """Calculate scalping signal from indicators"""
    bull_score = 0
    bear_score = 0

    # CVD contribution
    if cvd > 5: bull_score += 2
    elif cvd > 1: bull_score += 1
    elif cvd < -5: bear_score += 2
    elif cvd < -1: bear_score += 1

    # Order book imbalance (>60 = heavy bid side)
    if ob_imbalance > 65: bull_score += 2
    elif ob_imbalance > 55: bull_score += 1
    elif ob_imbalance < 35: bear_score += 2
    elif ob_imbalance < 45: bear_score += 1

    # Volume spike
    if vol_spike > 3: bull_score += 1 if cvd > 0 else 0; bear_score += 1 if cvd < 0 else 0

    net = bull_score - bear_score
    if net >= 4: return "STRONG_LONG"
    if net >= 2: return "LONG"
    if net <= -4: return "STRONG_SHORT"
    if net <= -2: return "SHORT"
    return "NEUTRAL"


async def _analyze_scalping_symbol(client, symbol: str, price: float, volume: float) -> Optional[Dict]:
    """Helper to fetch real OB and Trades for calculating imbalance and short-term CVD"""
    try:
        # Fetch data in parallel
        ob_task = client.fetch_order_book(symbol, limit=20)
        trades_task = client.fetch_trades(symbol, limit=200)
        ob, trades = await asyncio.gather(ob_task, trades_task)
        
        if not ob or not trades: return None
        
        # Calculate OB Imbalance
        bids = sum([l[1] for l in ob.get('bids', [])[:10]])
        asks = sum([l[1] for l in ob.get('asks', [])[:10]])
        total_ob = bids + asks
        ob_imbalance = (bids / total_ob * 100) if total_ob > 0 else 50
        
        # Calculate CVD (Cumulative Volume Delta)
        buy_vol = 0.0
        sell_vol = 0.0
        for t in trades:
            amt = t.get('amount', 0)
            if t.get('side') == 'buy': buy_vol += amt
            else: sell_vol += amt
            
        cvd = buy_vol - sell_vol
        cvd_ratio = (cvd / (buy_vol + sell_vol) * 100) if (buy_vol + sell_vol) > 0 else 0
        
        # Vol spike (simplified: check if recent 50 trades happened very fast)
        vol_spike = 1.0
        if len(trades) >= 50:
            time_span = abs(trades[-1]['timestamp'] - trades[-50]['timestamp']) / 1000.0
            if time_span > 0 and time_span < 10: # 50 trades in < 10 seconds is a spike
                vol_spike = min(5.0, 10.0 / time_span)

        change = 0.0 # Could fetch 24h ticker change if needed, leaving as 0 for scalping focus
        
        funding = 0.0
        try:
            funding_data = client.exchange.markets.get(symbol, {})
            funding = float(funding_data.get('info', {}).get('fundingRate', 0) or 0)
        except Exception: pass
        
        return {
            'id': f"scalp-{client.exchange_id}-{symbol}",
            'symbol': symbol,
            'exchange': client.exchange_id,
            'price': price,
            'change': change,
            'signal': _calc_signal(cvd_ratio, ob_imbalance, vol_spike),
            'cvd': round(cvd_ratio, 2),
            'obImbalance': round(ob_imbalance, 1),
            'volSpike': round(vol_spike, 2),
            'volume5m': round(volume * 30 / 1440, 0),
            'funding': funding,
        }
    except Exception as e:
        return None

async def get_scalping_opportunities(min_vol_spike: float = 1.5) -> List[Dict]:
    """Fetch scalping signals: vol spike, CVD delta, OB imbalance"""
    clients = await _get_clients()
    target_exchanges = ['binance', 'bybit', 'mexc']
    active_clients = [clients[name] for name in target_exchanges if name in clients]
    
    if not active_clients: return []

    all_tickers = await asyncio.gather(*[c.fetch_tickers() for c in active_clients], return_exceptions=True)
    
    symbols_to_analyze = []
    for client, tickers in zip(active_clients, all_tickers):
        if isinstance(tickers, Exception): continue
        top = sorted(tickers.items(), key=lambda x: x[1].get('volume', 0), reverse=True)[:15]
        for sym, t in top:
            symbols_to_analyze.append((client, sym, t.get('price', 0), t.get('volume', 0)))

    results = []
    batch_size = 5
    for i in range(0, len(symbols_to_analyze), batch_size):
        batch = symbols_to_analyze[i:i+batch_size]
        tasks = [_analyze_scalping_symbol(c, s, p, v) for c, s, p, v in batch]
        res = await asyncio.gather(*tasks)
        results.extend([r for r in res if r and r['signal'] != 'NEUTRAL' and r['volSpike'] >= min_vol_spike])
        if i + batch_size < len(symbols_to_analyze):
            await asyncio.sleep(0.3)

    # Sort by vol spike descending
    results.sort(key=lambda x: x['volSpike'], reverse=True)
    return results[:60]

async def _get_symbol_candles_and_analyze(client, symbol, price, volume_24h):
    """Helper to fetch 1h+4h candles and analyze range quality"""
    try:
        # Fetch both timeframes in parallel
        tasks = [
            asyncio.to_thread(client.exchange.fetch_ohlcv, symbol, '1h', limit=20),
            asyncio.to_thread(client.exchange.fetch_ohlcv, symbol, '4h', limit=20)
        ]
        res_1h, res_4h = await asyncio.gather(*tasks, return_exceptions=True)
        
        if isinstance(res_1h, Exception) or not res_1h or len(res_1h) < 10: return None
        if isinstance(res_4h, Exception) or not res_4h or len(res_4h) < 10: return None
        
        def calc_squeeze(candles):
            ranges = []
            for c in candles:
                h, l = c[2], c[3]
                if h > 0 and l > 0:
                    ranges.append((h - l) / ((h + l) / 2) * 100)
            if not ranges: return 1.0, 0.0
            avg_r = statistics.mean(ranges)
            recent_r = statistics.mean(ranges[-3:])
            return (recent_r / avg_r), avg_r

        sq_1h, avg_1h = calc_squeeze(res_1h)
        sq_4h, avg_4h = calc_squeeze(res_4h)
        
        # Channel from 4h (10 periods)
        lows = [c[3] for c in res_4h[-10:]]
        highs = [c[2] for c in res_4h[-10:]]
        c_low, c_high = min(lows), max(highs)
        width_pct = (c_high - c_low) / c_low * 100
        
        if width_pct < 1.0 or width_pct > 15: return None
        
        # Position and Volume check
        pos_pct = (price - c_low) / (c_high - c_low) * 100 if c_high > c_low else 50
        
        # Simple volume surge at bottom
        vol_surge = 1.0
        if pos_pct < 25:
            avg_vol = statistics.mean([c[5] for c in res_1h[-10:-1]])
            recent_vol = res_1h[-1][5]
            vol_surge = recent_vol / avg_vol if avg_vol > 0 else 1.0
            
        # Quality Score
        score = 0
        if sq_1h < 0.7: score += 20
        if sq_4h < 0.7: score += 20
        if 3.0 < width_pct < 8.0: score += 30
        if vol_surge > 1.5 and pos_pct < 30: score += 30 # Accumulation signal
        
        if score < 40: return None
        
        return {
            'symbol': symbol,
            'price': price,
            'channelLow': round(c_low, 6),
            'channelHigh': round(c_high, 6),
            'channelWidthPct': round(width_pct, 2),
            'posInChannel': round(pos_pct, 1),
            'squeezeRatio': round(sq_4h, 2), # Frontend expects squeezeRatio
            'volume24h': round(volume_24h, 0),
            'score': score,
            'volSurge': round(vol_surge, 1),
            'action': 'BUY' if pos_pct < 25 else 'SELL' if pos_pct > 75 else 'WAIT'
        }
    except: return None

async def get_grid_zones() -> List[Dict]:
    """
    Find horizontal trading ranges (grid opportunities) with multi-timeframe confirmation.
    """
    clients = await _get_clients()
    results = []
    
    ticker_tasks = [client.fetch_tickers() for client in clients.values()]
    exch_tickers = await asyncio.gather(*ticker_tasks, return_exceptions=True)
    
    analysis_tasks = []
    task_info = [] # (exch_name, symbol)
    
    for i, (name, client) in enumerate(clients.items()):
        tickers = exch_tickers[i]
        if isinstance(tickers, Exception) or not tickers: continue
        
        # Filter top 20 symbols per exchange by volume to keep it fast
        candidates = sorted(tickers.items(), key=lambda x: x[1].get('volume', 0), reverse=True)[:20]
        
        for symbol, t in candidates:
            if t.get('price') and t.get('volume', 0) > 100_000:
                analysis_tasks.append(_get_symbol_candles_and_analyze(client, symbol, t['price'], t['volume']))
                task_info.append((name, symbol))
                
    analysis_results = await asyncio.gather(*analysis_tasks)
    
    for i, res in enumerate(analysis_results):
        if res:
            name, symbol = task_info[i]
            res['id'] = f"grid-{name}-{symbol}"
            res['exchange'] = name
            results.append(res)
            
    results.sort(key=lambda x: x['score'], reverse=True)
    return results[:40]


async def get_basis_opportunities() -> List[Dict]:
    """
    Find basis (premium) between perpetual and quarterly futures on Binance.
    Quarterly symbols match pattern like BTC/USDT:USDT-260327
    """
    clients = await _get_clients()
    results = []

    binance = clients.get('binance')
    if not binance:
        return []

    try:
        markets = binance.exchange.markets
        # Build: base -> {perp, quarterly}
        base_map: Dict[str, Dict] = {}

        for symbol, m in markets.items():
            if m.get('quote') not in ['USDT', 'USDC']:
                continue
            if not m.get('active'):
                continue

            base = symbol.split('/')[0]
            m_type = m.get('type')

            if m_type == 'swap':
                if base not in base_map:
                    base_map[base] = {}
                base_map[base]['perp'] = symbol
            elif m_type == 'future':
                if base not in base_map:
                    base_map[base] = {}
                # Keep most recent quarterly
                base_map[base]['quarterly'] = symbol

        # Fetch tickers for pairs that have both
        pairs = [(b, v['perp'], v.get('quarterly')) for b, v in base_map.items()
                 if 'perp' in v and 'quarterly' in v]

        for base, perp_sym, quarterly_sym in pairs[:40]:
            try:
                perp_ticker = await asyncio.to_thread(
                    binance.exchange.fetch_ticker, perp_sym
                )
                quarterly_ticker = await asyncio.to_thread(
                    binance.exchange.fetch_ticker, quarterly_sym
                )

                perp_price = float(perp_ticker.get('last') or 0)
                quarterly_price = float(quarterly_ticker.get('last') or 0)

                if not perp_price or not quarterly_price:
                    continue

                basis_pct = (quarterly_price - perp_price) / perp_price * 100
                abs_basis = abs(basis_pct)

                if abs_basis < 0.1:
                    continue

                # Estimate annualized basis (assuming ~90 days to expiry on avg)
                # In production: calculate actual days to expiry from symbol name
                annual_basis = basis_pct * (365 / 90)

                results.append({
                    'id': f"basis-binance-{base}",
                    'base': base,
                    'perpSymbol': perp_sym,
                    'quarterlySymbol': quarterly_sym,
                    'perpPrice': perp_price,
                    'quarterlyPrice': quarterly_price,
                    'basisPct': round(basis_pct, 4),
                    'annualBasisPct': round(annual_basis, 2),
                    'action': 'LONG_PERP_SHORT_Q' if basis_pct > 0 else 'SHORT_PERP_LONG_Q',
                    'exchange': 'binance',
                })

            except Exception:
                continue

        results.sort(key=lambda x: abs(x['basisPct']), reverse=True)

    except Exception as e:
        print(f"⚠️ Screener basis: {e}")

    return results[:30]


async def get_alpha_opportunities(max_volume: float = 1_000_000) -> List[Dict]:
    """
    Find high-probability 'Alpha' in low-liquidity markets across exchanges.
    Detects: anomalous funding, price spreads vs Binance, and volume surges.
    """
    clients = await _get_clients()
    results = []
    
    # 1. Fetch data from all exchanges in parallel
    exch_names = list(clients.keys())
    ticker_tasks = [client.fetch_tickers() for client in clients.values()]
    funding_tasks = [client.fetch_funding_rates() for client in clients.values()]
    
    all_tickers_res = await asyncio.gather(*ticker_tasks, return_exceptions=True)
    all_fundings_res = await asyncio.gather(*funding_tasks, return_exceptions=True)
    
    # Map data: name -> tickers/fundings
    data_map = {}
    for i, name in enumerate(exch_names):
        t_res = all_tickers_res[i]
        f_res = all_fundings_res[i]
        data_map[name] = {
            'tickers': t_res if not isinstance(t_res, Exception) else {},
            'fundings': f_res if not isinstance(f_res, Exception) else {}
        }

    # 2. Extract Binance as reference (leader)
    binance_tickers = data_map.get('binance', {}).get('tickers', {})
    
    # 3. Analyze each exchange for Alphas
    for name, data in data_map.items():
        tickers = data['tickers']
        fundings = data['fundings']
        
        for symbol, ticker in tickers.items():
            try:
                price = ticker.get('price', 0)
                vol_24h = ticker.get('volume', 0)
                
                # Low-Liquidity target: $50k - $1.5M (wider than default for MEXC/Gate)
                if not price or vol_24h < 50_000 or vol_24h > max_volume * 1.5:
                    continue
                
                # Check Funding Alpha
                funding_info = fundings.get(symbol, {})
                funding_rate = float(funding_info.get('rate', 0) or 0)
                abs_funding_pct = abs(funding_rate * 100)
                
                # Check Spread Alpha (vs Binance)
                spread_pct = 0.0
                has_binance_ref = False
                if name != 'binance':
                    b_ticker = binance_tickers.get(symbol)
                    if not b_ticker:
                        # try without suffix
                        b_ticker = binance_tickers.get(symbol.split(':')[0])
                    
                    if b_ticker and b_ticker.get('price'):
                        b_price = b_ticker['price']
                        spread_pct = (price - b_price) / b_price * 100
                        has_binance_ref = True

                # Decide if it's an Alpha
                is_alpha = False
                alpha_type = []
                scores = []
                
                # Funding anomaly (>0.1% or <-0.1%)
                if abs_funding_pct > 0.08:
                    is_alpha = True
                    alpha_type.append("FUNDING")
                    scores.append(abs_funding_pct * 10)
                
                # Price spread (>0.4% which is significant for arb bots but slow for low-liq)
                if has_binance_ref and abs(spread_pct) > 0.4:
                    is_alpha = True
                    alpha_type.append("SPREAD")
                    scores.append(abs(spread_pct) * 20)
                
                    results.append({
                        'id': f"alpha-{name}-{symbol}",
                        'symbol': symbol,
                        'exchange': name,
                        'price': price,
                        'volume24h': round(vol_24h, 0),
                        'fundingRate': round(funding_rate * 100, 5),
                        'fundingDirection': 'HIGH' if funding_rate > 0 else 'LOW',
                        'competition': 'LOW' if vol_24h < 500_000 else 'MEDIUM',
                        'spreadVsBinance': round(spread_pct, 3) if has_binance_ref else None,
                        'alphaScore': int(sum(scores) + (10 if vol_24h < 200_000 else 0)),
                        'anomalyTypes': alpha_type,
                        'signal': 'SHORT' if (funding_rate > 0 or spread_pct > 0.5) else 'LONG' if (funding_rate < 0 or spread_pct < -0.5) else 'NEUTRAL'
                    })
            except Exception:
                continue

    # Sort by alpha score
    results.sort(key=lambda x: x['alphaScore'], reverse=True)
    return results[:50]


async def _analyze_bot_activity(client, symbol: str) -> Optional[Dict]:
    """
    Detailed bot detection per symbol:
    - Spoofing: Ghost orders that vanish without trades
    - MM Algo: High frequency of small trades (trades per second)
    - Wash Trading: Repetitive trade sizes at short intervals
    """
    try:
        # 1. First snapshot: Order Book + Trades
        ob1_task = client.fetch_order_book(symbol, limit=20)
        trades_task = client.fetch_trades(symbol, limit=100)
        ob1, trades = await asyncio.gather(ob1_task, trades_task)
        
        if not ob1 or not trades: return None
        
        # 2. Wait 1.5 seconds to detect 'flashing' / 'ghost' orders
        await asyncio.sleep(1.5)
        ob2 = await client.fetch_order_book(symbol, limit=20)
        
        # 3. Analyze Trades (MM / Wash Trading)
        if len(trades) < 10: return None
        
        # Trades per second
        time_span = abs(trades[-1]['timestamp'] - trades[0]['timestamp']) / 1000.0
        if time_span > 0:
            trades_per_sec = len(trades) / time_span
        else:
            trades_per_sec = 0

        # Wash Trading (repetitive sizes)
        sizes = [round(t['amount'], 4) for t in trades]
        size_counts = {}
        for s in sizes: size_counts[s] = size_counts.get(s, 0) + 1
        top_size_freq = max(size_counts.values()) / len(trades) if trades else 0

        # 4. Analyze Order Book (Spoofing)
        # Check if big orders in ob1 vanished in ob2 without trades in between
        # This is a simplification; we check if the top 5 levels moved 
        bids1 = {round(l[0], 6): l[1] for l in ob1.get('bids', [])[:10]}
        bids2 = {round(l[0], 6): l[1] for l in ob2.get('bids', [])[:10]}
        
        spoof_score = 0
        for price, vol in bids1.items():
            if price not in bids2 and vol > 1.0: # Simplistic check: order gone
                spoof_score += 10

        # 5. Classify & Score
        bot_type = None
        confidence = 0
        
        if trades_per_sec > 5: # Reduced from 10
            bot_type = 'MM_ALGO'
            confidence = min(40 + int(trades_per_sec * 5), 99)
        elif top_size_freq > 0.3: # Reduced from 0.4
            bot_type = 'WASH_TRADING'
            confidence = min(int(top_size_freq * 120), 99)
        elif spoof_score > 10: # Reduced from 20
            bot_type = 'SPOOFING'
            confidence = min(50 + spoof_score, 99)
        
        if bot_type:
            price = trades[-1]['price']
            return {
                'id': f"bot-{client.exchange_id}-{symbol}-{int(time.time())}",
                'symbol': symbol,
                'exchange': client.exchange_id,
                'botType': bot_type,
                'confidence': confidence,
                'impact': 'HIGH' if confidence > 80 else 'MEDIUM',
                'price': price,
                'metrics': {
                    'tps': round(trades_per_sec, 2),
                    'freq': round(top_size_freq, 2)
                },
                'timestamp': time.time()
            }
        return None
    except Exception as e:
        print(f"❌ Error analyzing bot activity for {symbol} on {client.exchange_id}: {e}")
        return None

async def get_bot_detection() -> List[Dict]:
    """
    Detect market maker and bot activity across exchanges.
    """
    clients = await _get_clients()
    
    # We choose top volume symbols from main exchanges
    target_exchanges = ['binance', 'bybit', 'mexc']
    active_clients = [clients[name] for name in target_exchanges if name in clients]
    
    if not active_clients: return []
    
    all_tickers = await asyncio.gather(*[c.fetch_tickers() for c in active_clients], return_exceptions=True)
    
    symbols_to_analyze = []
    for client, tickers in zip(active_clients, all_tickers):
        if isinstance(tickers, Exception): continue
        # Sort by volume and take top 10
        top = sorted(tickers.items(), key=lambda x: x[1].get('volume', 0), reverse=True)[:8]
        for sym, _ in top:
            symbols_to_analyze.append((client, sym))
            
    # Run bot analysis in batches to respect rate limits (especially MEXC)
    results = []
    batch_size = 4
    for i in range(0, len(symbols_to_analyze), batch_size):
        batch = symbols_to_analyze[i:i+batch_size]
        analysis_tasks = [_analyze_bot_activity(c, sym) for c, sym in batch]
        batch_results = await asyncio.gather(*analysis_tasks)
        results.extend(batch_results)
        if i + batch_size < len(symbols_to_analyze):
            await asyncio.sleep(0.5)
    
    final = [r for r in results if r is not None]
    final.sort(key=lambda x: x['confidence'], reverse=True)
    return final

async def get_new_listings() -> List[Dict]:
    """
    Monitor for new coin listings in the last 24-48 hours.
    """
    clients = await _get_clients()
    results = []
    
    current_time = time.time()
    
    for name, client in clients.items():
        try:
            # Get exchange info to see launch times if available, or compare with local cache
            # For now, we simulate finding new listings
            mock_listings = [
                {'symbol': 'PEPE2/USDT', 'launchTime': current_time - 3600*2, 'price': 0.000001, 'change': 15.5},
                {'symbol': 'TRUMP/USDT', 'launchTime': current_time - 3600*12, 'price': 12.4, 'change': -2.1},
                {'symbol': 'VIRTUAL/USDT', 'launchTime': current_time - 3600*20, 'price': 0.85, 'change': 45.0},
            ]
            
            for listing in mock_listings:
                listing['id'] = f"list-{name}-{listing['symbol']}"
                listing['exchange'] = name
                results.append(listing)
        except: continue
    return results

async def get_iceberg_orders() -> List[Dict]:
    """
    Detect hidden 'Iceberg' orders by comparing realized volume vs visible liquidity.
    """
    clients = await _get_clients()
    results = []
    
    # Target major exchanges for liquidity analysis
    target_names = ['binance', 'mexc', 'bybit']
    active_clients = {name: clients[name] for name in target_names if name in clients}
    
    if not active_clients:
        return []

    try:
        # 1. Fetch top tickers to find most active symbols
        ticker_tasks = [client.fetch_tickers() for client in active_clients.values()]
        ticker_results = await asyncio.gather(*ticker_tasks, return_exceptions=True)
        
        symbols_to_check = [] # (symbol, name, client)
        for (name, client), res in zip(active_clients.items(), ticker_results):
            if isinstance(res, Exception): continue
            
            # Take top 5 symbols by volume per exchange
            top_symbols = sorted(
                res.items(), 
                key=lambda x: x[1].get('volume', 0), 
                reverse=True
            )[:5]
            
            for sym, _ in top_symbols:
                symbols_to_check.append((sym, name, client))

        # 2. Parallel fetch OB and Trades
        ob_tasks = []
        trade_tasks = []
        for sym, name, client in symbols_to_check:
            ob_tasks.append(client.fetch_order_book(sym, limit=20))
            trade_tasks.append(client.fetch_trades(sym, limit=200))

        ob_results = await asyncio.gather(*ob_tasks, return_exceptions=True)
        trade_results = await asyncio.gather(*trade_tasks, return_exceptions=True)

        # 3. Analyze for Icebergs
        for i, (sym, name, client) in enumerate(symbols_to_check):
            ob = ob_results[i]
            trades = trade_results[i]
            
            if isinstance(ob, Exception) or isinstance(trades, Exception):
                continue

            # Group trades by price
            price_vol = {} # price -> {qty: float, side_buys: int, side_sells: int}
            for t in trades:
                price = t.get('price')
                if price is None: continue
                
                if price not in price_vol:
                    price_vol[price] = {'qty': 0.0, 'buys': 0, 'sells': 0}
                
                price_vol[price]['qty'] += t.get('amount', 0)
                if t.get('side') == 'buy':
                    price_vol[price]['buys'] += 1
                else:
                    price_vol[price]['sells'] += 1

            # Check visible liquidity for these prices
            # Bids (price level for hidden SELL orders being hit by buys)
            # Asks (price level for hidden BUY orders being hit by sells)
            
            # Map OB for quick lookups (safe unpack for exchanges returning extra fields)
            bids = {level[0]: level[1] for level in ob.get('bids', []) if len(level) >= 2}
            asks = {level[0]: level[1] for level in ob.get('asks', []) if len(level) >= 2}

            for price, stats in price_vol.items():
                traded_qty = stats['qty']
                if traded_qty == 0: continue
                
                # Hidden Order Detection:
                # If we see tons of buys at price X, but it hasn't broken through, 
                # and visible Ask volume at X is small, there's a hidden SELL iceberg.
                
                is_buy_iceberg = False
                is_sell_iceberg = False
                visible_qty = 0.0
                
                if price in bids:
                    visible_qty = bids[price]
                    # Logic: Many sells hit this price, but visible bid is low
                    if stats['sells'] > 5 and traded_qty > visible_qty * 4.0:
                        is_buy_iceberg = True
                
                if price in asks:
                    visible_qty = asks[price]
                    # Logic: Many buys hit this price, but visible ask is low
                    if stats['buys'] > 5 and traded_qty > visible_qty * 4.0:
                        is_sell_iceberg = True

                # Threshold: At least $10k traded at this level to be significant
                traded_value = traded_qty * price
                if (is_buy_iceberg or is_sell_iceberg) and traded_value > 10_000:
                    results.append({
                        'id': f"ice-{name}-{sym}-{price}",
                        'symbol': sym,
                        'exchange': name,
                        'side': 'BUY' if is_buy_iceberg else 'SELL',
                        'price': price,
                        'hiddenVolume': round(traded_qty - visible_qty, 2),
                        'revealedVolume': round(traded_qty, 2),
                        'visibleVolume': round(visible_qty, 2),
                        'confidence': min(int((traded_qty / (visible_qty or 0.1)) * 10), 99)
                    })

    except Exception as e:
        print(f"⚠️ Screener iceberg error: {e}")

    return results[:30]

async def _analyze_midterm_symbol(client, symbol: str, price: float, volume: float) -> Optional[Dict]:
    """Helper to fetch real 1h candles and Open Interest for midterm analysis"""
    try:
        # Fetch 1h candles
        candles = await asyncio.to_thread(client.exchange.fetch_ohlcv, symbol, '1h', limit=24)
        if not candles or len(candles) < 24: return None
        
        # Calculate 1h CVD proxy (using candle close vs open to guess buyer/seller dominance)
        # Real CVD is better from trades, but 1h trades takes too many requests. 
        # Using Price * Volume Delta approximation
        cvd_1h = 0.0
        for c in candles[-10:]:
            o, c_val, v = c[1], c[4], c[5]
            if c_val > o: cvd_1h += v 
            elif c_val < o: cvd_1h -= v
            
        cvd_ratio = (cvd_1h / sum(c[5] for c in candles[-10:])) * 100 if sum(c[5] for c in candles[-10:]) > 0 else 0

        # Volume Trend
        recent_vol = sum(c[5] for c in candles[-3:])
        past_vol = sum(c[5] for c in candles[-6:-3])
        vol_trend = 'UP' if recent_vol > past_vol * 1.5 else 'STABLE' if recent_vol >= past_vol * 0.8 else 'DOWN'

        # Fetch Open Interest (if supported)
        oi_val = 0.0
        oi_change = 0.0
        if client.exchange.has.get('fetchOpenInterest'):
            try:
                oi_data = await asyncio.to_thread(client.exchange.fetch_open_interest, symbol)
                oi_val = float(oi_data.get('openInterestValue', 0) or oi_data.get('openInterestAmount', 0))
                # Without historical OI endpoint, we simulate the change based on price action + vol trend
                # In production, you'd store OI in DB every 5 mins and compare to get actual % change
                # Here we use CVD and Vol Trend to estimate if OI is actively increasing
                multiplier = 1.0 if cvd_1h > 0 else -1.0
                oi_change = round(min(15.0, abs(cvd_ratio) / 3.0) * (1.5 if vol_trend == 'UP' else 0.8) * multiplier, 2)
            except: pass
        else:
            # Fallback if exchange doesn't support OI: highly weigh the CVD ratio
            oi_change = round(cvd_ratio / 5.0, 2)

        # Signal Logic
        if oi_change > 3.0 and cvd_ratio > 10.0 and vol_trend == 'UP':
            signal = 'STRONG_BULLISH'
        elif oi_change > 1.5 and cvd_ratio > 5.0:
            signal = 'BULLISH'
        elif oi_change < -3.0 and cvd_ratio < -10.0 and vol_trend == 'UP':
            signal = 'STRONG_BEARISH'
        elif oi_change < -1.5 and cvd_ratio < -5.0:
            signal = 'BEARISH'
        elif abs(oi_change) < 1.0 and vol_trend == 'DOWN' and abs(cvd_ratio) < 10.0:
            signal = 'ACCUMULATION'
        else:
            return None # Skip neutral

        return {
            'id': f"mid-{client.exchange_id}-{symbol}",
            'symbol': symbol,
            'exchange': client.exchange_id,
            'price': price,
            'oiChangePct': oi_change,
            'cvd1h': round(cvd_ratio, 2),
            'volTrend': vol_trend,
            'signal': signal
        }
    except Exception as e:
        return None

async def get_midterm_opportunities() -> List[Dict]:
    """
    Find midterm opportunities (1h-4h).
    Focus on OI increase proxy + CVD divergence + Volume trend.
    """
    clients = await _get_clients()
    target_exchanges = ['binance', 'bybit', 'mexc']
    active_clients = [clients[name] for name in target_exchanges if name in clients]
    
    if not active_clients: return []

    all_tickers = await asyncio.gather(*[c.fetch_tickers() for c in active_clients], return_exceptions=True)
    
    symbols_to_analyze = []
    for client, tickers in zip(active_clients, all_tickers):
        if isinstance(tickers, Exception): continue
        top = sorted(tickers.items(), key=lambda x: x[1].get('volume', 0), reverse=True)[:15]
        for sym, t in top:
            symbols_to_analyze.append((client, sym, t.get('price', 0), t.get('volume', 0)))

    results = []
    batch_size = 5
    for i in range(0, len(symbols_to_analyze), batch_size):
        batch = symbols_to_analyze[i:i+batch_size]
        tasks = [_analyze_midterm_symbol(c, s, p, v) for c, s, p, v in batch]
        res = await asyncio.gather(*tasks)
        results.extend([r for r in res if r])
        if i + batch_size < len(symbols_to_analyze):
            await asyncio.sleep(0.3)

    results.sort(key=lambda x: abs(x['oiChangePct']), reverse=True)
    return results[:30]

async def get_sentiment_opportunities() -> List[Dict]:
    """
    Detect social sentiment trends.
    Aggregates simulated AI scores from Twitter, Discord, and News.
    """
    # Mock sentiment aggregator
    symbols = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BONK/USDT', 'DOGE/USDT', 'RENDER/USDT']
    results = []
    
    current_time = time.time()
    for sym in symbols:
        # Consistency based on symbol and hour
        seed = sym + str(int(current_time / 3600))
        h = hash(seed)
        
        social_volume = 50 + (h % 950)
        sentiment_score = round((h % 100) / 10, 1) # 0.0 to 10.0
        
        if social_volume > 300 or sentiment_score > 8.0 or sentiment_score < 2.0:
            results.append({
                'id': f"sent-{sym}",
                'symbol': sym,
                'score': sentiment_score,
                'status': 'BULLISH' if sentiment_score > 7 else 'BEARISH' if sentiment_score < 3 else 'NEUTRAL',
                'socialVolume': social_volume,
                'trendingPlatforms': ['Twitter', 'Discord'] if h % 2 == 0 else ['News', 'Telegram'],
                'hotNews': "Massive adoption news circulating" if sentiment_score > 8 else "FUD regarding regulation" if sentiment_score < 2 else "Normal activity"
            })
            
    return results

async def _safe_fetch_volume_30m(client, symbol, retries=1):
    """Safely fetch 30m volume with simple retry logic"""
    for i in range(retries + 1):
        try:
            return await client.fetch_volume_30m(symbol)
        except Exception as e:
            if "too frequent" in str(e).lower() or "429" in str(e) and i < retries:
                await asyncio.sleep(1.0 * (i + 1))
                continue
            return 0.0
    return 0.0

async def get_mexc_zero_fee_opportunities() -> List[Dict]:
    """
    Find tokens on MEXC with 0% maker fee and compare prices with Binance/Bybit.
    Optimized for performance using parallel fetching and batching.
    """
    clients = await _get_clients()
    mexc = clients.get('mexc')
    if not mexc:
        return []

    results = []
    try:
        # 1. Start fetching tickers from all exchanges in parallel
        target_exchanges = ['binance', 'bybit', 'gate', 'astradex', 'hyperliquid']
        ticker_tasks = []
        exchange_names = []
        
        for name in target_exchanges:
            client = clients.get(name)
            if client:
                ticker_tasks.append(client.fetch_tickers())
                exchange_names.append(name)
        
        # Also fetch MEXC tickers
        mexc_tickers_task = asyncio.create_task(mexc.fetch_tickers())
        
        # Gather all tickers
        other_tickers_results = await asyncio.gather(*ticker_tasks, return_exceptions=True)
        other_tickers = {}
        for name, res in zip(exchange_names, other_tickers_results):
            if not isinstance(res, Exception):
                other_tickers[name] = res
        
        mexc_tickers = await mexc_tickers_task
        if not mexc_tickers:
            return []

        # 2. Identify zero-fee symbols
        markets = mexc.exchange.markets
        zero_fee_symbols = []
        for symbol, market in markets.items():
            if (market.get('type') in ['swap', 'future']) and \
               market.get('quote') in ['USDT', 'USDC'] and \
               market.get('active', True) and \
               market.get('maker', 1.0) == 0.0:
                zero_fee_symbols.append(symbol)

        # 3. Filter candidates by volume BEFORE expensive candle requests
        candidates = []
        for symbol in zero_fee_symbols:
            t = mexc_tickers.get(symbol)
            if t and t.get('price') and t.get('volume', 0) > 50_000:
                candidates.append(symbol)
        
        candidates.sort(key=lambda x: mexc_tickers[x]['volume'], reverse=True)
        target_candidates = candidates[:40] # Limit to top 40 for responsiveness
        
        if not target_candidates:
            return []

        # 4. Prepare ALL volume requests (MEXC + competitors)
        # We'll batch them to avoid hitting rate limits too hard
        all_vol_tasks = []
        task_metadata = [] # (symbol, exchange_name, ticker_obj_if_not_mexc)

        # Add MEXC volume tasks
        for symbol in target_candidates:
            all_vol_tasks.append(_safe_fetch_volume_30m(mexc, symbol))
            task_metadata.append((symbol, 'mexc', None))

        # Add competitor volume tasks
        for symbol in target_candidates:
            price_mexc = mexc_tickers[symbol]['price']
            
            for name in target_exchanges:
                tickers = other_tickers.get(name, {})
                client = clients.get(name)
                if not client: continue
                
                comp_ticker = tickers.get(symbol)
                if not comp_ticker:
                    # Try matching without :USDT suffix
                    base = symbol.split('/')[0]
                    quote = symbol.split('/')[1].split(':')[0]
                    alt_sym = f"{base}/{quote}"
                    comp_ticker = tickers.get(alt_sym)

                if comp_ticker and comp_ticker.get('price'):
                    all_vol_tasks.append(_safe_fetch_volume_30m(client, comp_ticker['symbol']))
                    task_metadata.append((symbol, name, comp_ticker))

        # Execute all volume tasks in small batches to respect rate limits
        all_vols = []
        batch_size = 5 # Smaller batch
        for i in range(0, len(all_vol_tasks), batch_size):
            batch = all_vol_tasks[i:i+batch_size]
            batch_results = await asyncio.gather(*batch)
            all_vols.extend(batch_results)
            if i + batch_size < len(all_vol_tasks):
                await asyncio.sleep(0.3) # Increased delay

        # 5. Aggregate results
        mexc_data = {} # symbol -> {vol, price}
        comp_data = {} # symbol -> {exchange: {vol, price, spread}}

        for (symbol, ex_name, comp_ticker), vol in zip(task_metadata, all_vols):
            if ex_name == 'mexc':
                mexc_data[symbol] = {'vol': vol, 'price': mexc_tickers[symbol]['price']}
            else:
                if symbol not in comp_data:
                    comp_data[symbol] = {}
                
                price_mexc = mexc_tickers[symbol]['price']
                price_comp = comp_ticker['price']
                spread = (price_comp - price_mexc) / price_mexc * 100
                
                comp_data[symbol][ex_name] = {
                    'price': price_comp,
                    'vol30m': round(vol, 0),
                    'spread': round(spread, 3)
                }

        for symbol, data in mexc_data.items():
            if data['vol'] < 1000: continue # Skip very low activity
            
            comps = comp_data.get(symbol, {})
            if not comps: continue # Only show if there's someone to compare with
            
            max_spread = max([c['spread'] for c in comps.values()], key=abs)
            
            results.append({
                'id': f"mexc-zf-{symbol}",
                'symbol': symbol,
                'priceMexc': data['price'],
                'volMexc30m': round(data['vol'], 0),
                'comparisons': comps,
                'maxSpread': round(max_spread, 3),
                'exchange': 'mexc'
            })

    except Exception as e:
        print(f"⚠️ Screener MEXC Zero-Fee: {e}")
        import traceback
        traceback.print_exc()

    results.sort(key=lambda x: abs(x['maxSpread']), reverse=True)
    return results[:50]

async def get_screener_status() -> Dict:
    """Summary of active signals across all screeners"""
    try:
        # Run light checks in parallel
        scalping_task = asyncio.create_task(get_scalping_opportunities())
        alpha_task = asyncio.create_task(get_alpha_opportunities())
        grid_task = asyncio.create_task(get_grid_zones())
        bot_task = asyncio.create_task(get_bot_detection())
        midterm_task = asyncio.create_task(get_midterm_opportunities())
        sentiment_task = asyncio.create_task(get_sentiment_opportunities())
        mexc_zf_task = asyncio.create_task(get_mexc_zero_fee_opportunities())

        scalping = await scalping_task
        grid = await grid_task
        strong_scalp = [s for s in scalping if s.get('signal') in ('STRONG_LONG', 'STRONG_SHORT')]

        alpha = await alpha_task
        bots = await bot_task
        midterm = await midterm_task
        sentiment = await sentiment_task
        mexc_zf = await mexc_zf_task

        return {
            'success': True,
            'signals': {
                'scalping': {'count': len(strong_scalp)},
                'grid_zones': {'count': len(grid)},
                'alpha': {'count': len(alpha)},
                'bots': {'count': len(bots)},
                'midterm': {'count': len([m for m in midterm if m['signal'] != 'ACCUMULATION'])},
                'sentiment': {'count': len([s for s in sentiment if s['status'] != 'NEUTRAL'])},
                'mexc_zf': {'count': len(mexc_zf)},
            },
            'total_signals': len(strong_scalp) + len(grid) + len(alpha) + len(bots) + len(midterm) + len(sentiment) + len(mexc_zf),
        }
    except Exception as e:
        return {'success': False, 'signals': {}, 'total_signals': 0, 'error': str(e)}
