import React, { useState, useEffect, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Globe } from 'lucide-react';

const TokenRow = memo(({ token, exConfig, idx }) => {
    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2, delay: idx * 0.03 }}
            whileHover={{ background: 'rgba(255,255,255,0.03)', x: 4 }}
            style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1.5fr 1.5fr 1.5fr 1fr',
                alignItems: 'center',
                padding: '20px 30px',
                background: 'rgba(255,255,255,0.01)',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.02)',
                cursor: 'pointer',
                willChange: 'transform, opacity'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '900',
                    color: '#4ecdc4',
                    fontSize: '0.75rem',
                    overflow: 'hidden'
                }}>
                    <img
                        src={`https://cryptoicons.org/api/color/${token.symbol.split('/')[0].toLowerCase()}/128`}
                        alt=""
                        style={{ width: '20px', height: '20px' }}
                        onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentNode.innerText = token.symbol.split('/')[0].substring(0, 2);
                        }}
                    />
                </div>
                <div>
                    <div style={{ fontWeight: '800', color: '#fff', fontSize: '0.95rem' }}>{token.symbol}</div>
                    <div style={{ fontSize: '0.75rem', color: token.change >= 0 ? '#4CAF50' : '#f44336', fontWeight: '700', marginTop: '2px' }}>
                        {token.change >= 0 ? '+' : ''}{token.change}%
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {exConfig.logo && (
                    <img
                        src={exConfig.logo}
                        alt={exConfig.name}
                        style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '4px',
                            background: '#fff',
                            padding: '1px'
                        }}
                    />
                )}
                <span style={{
                    fontSize: '0.65rem',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    background: `${exConfig.color}10`,
                    border: `1px solid ${exConfig.color}20`,
                    color: exConfig.color,
                    fontWeight: '800',
                    letterSpacing: '0.5px'
                }}>
                    {token.exchange.toUpperCase()}
                </span>
            </div>

            <div style={{ fontWeight: '700', color: '#fff', fontSize: '1rem' }}>
                ${token.price}
            </div>

            <div style={{ color: '#444', fontWeight: '600', fontSize: '0.85rem' }}>
                {token.volume}
            </div>

            <div style={{ textAlign: 'right' }}>
                <button
                    className="chart-btn"
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#444',
                        cursor: 'pointer',
                        padding: '8px',
                        transition: 'color 0.2s ease'
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        window.open('/tv', '_blank');
                    }}
                >
                    <LineChart size={18} />
                </button>
            </div>
        </motion.div>
    );
});

const MarketScreener = () => {
    const [selectedExchange, setSelectedExchange] = useState('all');
    const [marketType, setMarketType] = useState('spot');
    const [tokens, setTokens] = useState([]);
    const [loading, setLoading] = useState(false);

    const exchanges = useMemo(() => [
        { id: 'all', name: 'All Exchanges', color: '#fff' },
        { id: 'binance', name: 'Binance', color: '#F3BA2F', logo: 'https://v2.coinmarketcap.com/static/img/exchanges/64x64/270.png' },
        { id: 'bybit', name: 'Bybit', color: '#f7a600', logo: 'https://v2.coinmarketcap.com/static/img/exchanges/64x64/521.png' },
        { id: 'gate', name: 'Gate.io', color: '#e4312b', logo: 'https://v2.coinmarketcap.com/static/img/exchanges/64x64/302.png' },
        { id: 'mexc', name: 'MEXC', color: '#0052ff', logo: 'https://v2.coinmarketcap.com/static/img/exchanges/64x64/544.png' },
        { id: 'bingx', name: 'BingX', color: '#2b51ff', logo: 'https://v2.coinmarketcap.com/static/img/exchanges/64x64/1113.png' },
        { id: 'hyperliquid', name: 'Hyperliquid', color: '#a54eff', logo: 'https://hyperliquid.xyz/favicon.png' },
        { id: 'astradex', name: 'Astradex', color: '#4ecdc4', logo: 'https://astradex.io/favicon.ico' }
    ], []);

    useEffect(() => {
        setLoading(true);
        const mockTokens = [
            { symbol: 'BTC/USDT', exchange: 'Binance', price: '64,250.21', change: 2.5, type: 'spot', volume: '1.2B' },
            { symbol: 'ETH/USDT', exchange: 'Bybit', price: '3,450.55', change: -1.2, type: 'futures', volume: '800M' },
            { symbol: 'SOL/USDT', exchange: 'MEXC', price: '145.12', change: 5.8, type: 'spot', volume: '450M' },
            { symbol: 'BNB/USDT', exchange: 'Binance', price: '580.33', change: 0.4, type: 'futures', volume: '200M' },
            { symbol: 'PURP/USDC', exchange: 'Hyperliquid', price: '1.22', change: 12.5, type: 'futures', volume: '15M' },
            { symbol: 'TON/USDT', exchange: 'Gate', price: '7.12', change: -3.4, type: 'spot', volume: '80M' },
            { symbol: 'AVAX/USDT', exchange: 'BingX', price: '32.12', change: 1.5, type: 'futures', volume: '120M' }
        ];

        const filtered = mockTokens.filter(t => {
            const matchExchange = selectedExchange === 'all' || t.exchange.toLowerCase().includes(selectedExchange.toLowerCase());
            const matchType = t.type === marketType;
            return matchExchange && matchType;
        });

        const timer = setTimeout(() => {
            setTokens(filtered);
            setLoading(false);
        }, 400);
        return () => clearTimeout(timer);
    }, [selectedExchange, marketType]);

    return (
        <div style={{ padding: '30px' }}>
            {/* Control Bar */}
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '30px',
                background: 'rgba(0,0,0,0.2)',
                padding: '20px',
                borderRadius: '24px',
                border: '1px solid rgba(255,255,255,0.03)'
            }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', maxWidth: '75%' }}>
                    {exchanges.map(ex => (
                        <button
                            key={ex.id}
                            onClick={() => setSelectedExchange(ex.id)}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '10px',
                                border: '1px solid transparent',
                                borderColor: selectedExchange === ex.id ? `${ex.color}44` : 'rgba(255,255,255,0.03)',
                                background: selectedExchange === ex.id ? `${ex.color}10` : 'rgba(0,0,0,0.2)',
                                color: selectedExchange === ex.id ? ex.color : '#555',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            {ex.logo ? (
                                <img src={ex.logo} alt="" style={{ width: '14px', height: '14px', borderRadius: '2px' }} />
                            ) : (
                                ex.id === 'all' ? <Globe size={12} /> : <div style={{ width: 5, height: 5, borderRadius: '50%', background: ex.color }} />
                            )}
                            {ex.name}
                        </button>
                    ))}
                </div>

                <div style={{
                    display: 'flex',
                    background: 'rgba(0,0,0,0.4)',
                    padding: '4px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.05)'
                }}>
                    {['spot', 'futures'].map(type => (
                        <button
                            key={type}
                            onClick={() => setMarketType(type)}
                            style={{
                                padding: '8px 20px',
                                borderRadius: '9px',
                                border: 'none',
                                background: marketType === type ? '#4ecdc4' : 'transparent',
                                color: marketType === type ? '#000' : '#444',
                                fontWeight: '800',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                transition: 'all 0.2s ease',
                                textTransform: 'uppercase'
                            }}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </header>

            {/* Table Header */}
            <div style={{ padding: '0 30px 12px', color: '#333', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px', display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr 1.5fr 1fr' }}>
                <span>Pair</span>
                <span>Exchange</span>
                <span>Price</span>
                <span>Vol 24h</span>
                <span style={{ textAlign: 'right' }}>Graph</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {loading ? (
                    <div style={{ padding: '80px', textAlign: 'center' }}>
                        <div className="shimmer" style={{ color: '#222', fontWeight: '700', letterSpacing: '1px', fontSize: '0.8rem' }}>STREAMING DATA...</div>
                    </div>
                ) : tokens.length === 0 ? (
                    <div style={{ padding: '60px', textAlign: 'center', color: '#333', background: 'rgba(0,0,0,0.1)', borderRadius: '24px', border: '1px dashed #222' }}>
                        No results.
                    </div>
                ) : (
                    <AnimatePresence mode='popLayout'>
                        {tokens.map((token, idx) => (
                            <TokenRow
                                key={token.symbol + token.exchange}
                                token={token}
                                exConfig={exchanges.find(e => e.id === token.exchange.toLowerCase() || e.id === token.exchange.toLowerCase().replace('.', '')) || { color: '#888' }}
                                idx={idx}
                            />
                        ))}
                    </AnimatePresence>
                )}
            </div>

            <style>{`
                .chart-btn:hover { color: #fff !important; transform: scale(1.1); }
                .shimmer { animation: pulse 1.5s infinite; }
                @keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.6; } }
            `}</style>
        </div>
    );
};

export default MarketScreener;
