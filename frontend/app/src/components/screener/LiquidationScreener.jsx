import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, RefreshCw, Clock, Zap } from 'lucide-react';

const EXCHANGES = ['binance', 'bybit', 'mexc'];

const LIQ_THRESHOLD = 50_000; // $50k minimum

const formatUSD = (v) => {
    if (!v) return '$0';
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
    return `$${v.toFixed(0)}`;
};

const formatTimeAgo = (ts) => {
    if (!ts) return '–';
    const diff = (Date.now() - ts) / 1000;
    if (diff < 5) return 'только что';
    if (diff < 60) return `${Math.floor(diff)}с назад`;
    if (diff < 3600) return `${Math.floor(diff / 60)}м назад`;
    return `${Math.floor(diff / 3600)}ч назад`;
};

const PulseRing = ({ color }) => (
    <span style={{ position: 'relative', display: 'inline-flex', width: '10px', height: '10px' }}>
        <span style={{
            position: 'absolute', width: '100%', height: '100%',
            borderRadius: '50%', background: color, opacity: 0.4,
            animation: 'liqPulse 1.5s ease-out infinite'
        }} />
        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, position: 'relative' }} />
    </span>
);

const LiqRow = ({ item, idx }) => {
    const isLong = item.side === 'LONG'; // Liquidated longs → price dropped
    const actionColor = isLong ? '#FF5722' : '#4CAF50'; // Longs liqd → bearish; Shorts liqd → bullish
    const actionLabel = isLong ? '🔴 Лонги' : '🟢 Шорты';
    const bounceLabel = isLong ? '↓ Продолжение' : '↑ Отскок';
    const age = (Date.now() - item.timestamp) / 1000; // seconds
    const isFresh = age < 30;

    return (
        <motion.tr
            initial={{ opacity: 0, y: -8, background: `${actionColor}25` }}
            animate={{ opacity: 1, y: 0, background: 'transparent' }}
            transition={{ delay: idx * 0.025 }}
            style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
            <td style={td}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isFresh && <PulseRing color={actionColor} />}
                    <div>
                        <div style={{ fontWeight: '800', color: '#fff' }}>{item.symbol.split('/')[0]}</div>
                        <div style={{ fontSize: '0.7rem', color: '#555', textTransform: 'uppercase' }}>{item.exchange}</div>
                    </div>
                </div>
            </td>
            <td style={td}>
                <span style={{
                    padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '800',
                    background: `${actionColor}18`, border: `1px solid ${actionColor}35`, color: actionColor
                }}>
                    {actionLabel} ликвид.
                </span>
            </td>
            <td style={td}>
                <div style={{
                    fontWeight: '900', fontSize: '1.0rem',
                    color: item.usdValue >= 500_000 ? '#FFD700' : item.usdValue >= 100_000 ? '#FF9800' : '#e0e0e0'
                }}>
                    {formatUSD(item.usdValue)}
                    {item.usdValue >= 500_000 && ' 🔥'}
                </div>
            </td>
            <td style={td}>
                <div style={{ color: '#888', fontSize: '0.83rem' }}>${(item.price || 0).toLocaleString()}</div>
            </td>
            <td style={td}>
                <div style={{ color: '#666', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Clock size={11} />
                    {formatTimeAgo(item.timestamp)}
                </div>
            </td>
            <td style={td}>
                <div style={{
                    padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '800',
                    background: `${actionColor}12`, color: actionColor, display: 'inline-block'
                }}>
                    {bounceLabel}
                </div>
            </td>
        </motion.tr>
    );
};

const th = {
    padding: '12px 14px',
    fontSize: '0.68rem', fontWeight: '800',
    color: '#444', textTransform: 'uppercase',
    letterSpacing: '0.8px', textAlign: 'left', whiteSpace: 'nowrap'
};

const td = {
    padding: '14px 14px',
    color: '#e0e0e0', verticalAlign: 'middle'
};

// Generates a mock liquidation event
const generateMockLiq = () => {
    const symbols = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'DOGE/USDT', 'SUI/USDT', 'WIF/USDT', 'INJ/USDT'];
    const exchanges = ['binance', 'bybit', 'mexc'];
    const sides = ['LONG', 'SHORT'];
    return {
        id: Math.random().toString(36).slice(2),
        symbol: symbols[Math.floor(Math.random() * symbols.length)],
        exchange: exchanges[Math.floor(Math.random() * exchanges.length)],
        side: sides[Math.floor(Math.random() * sides.length)],
        usdValue: Math.random() * 2_000_000 + 20_000,
        price: Math.random() * 80000 + 1000,
        timestamp: Date.now() - Math.random() * 120_000,
    };
};

const LiquidationScreener = () => {
    const [events, setEvents] = useState([]);
    const [minSize, setMinSize] = useState(50_000);
    const [selectedExchanges, setSelectedExchanges] = useState(EXCHANGES);
    const [sideFilter, setSideFilter] = useState('all');
    const [connected, setConnected] = useState(false);
    const [stats, setStats] = useState({ count: 0, totalUsd: 0 });
    const wsRef = useRef(null);
    const maxEvents = 100;

    // WebSocket connection to backend
    useEffect(() => {
        const connect = () => {
            try {
                const ws = new WebSocket(`ws://${window.location.host}/ws/screener/liquidations`);
                wsRef.current = ws;

                ws.onopen = () => { setConnected(true); };

                ws.onmessage = (e) => {
                    try {
                        const liq = JSON.parse(e.data);
                        if (liq.usdValue >= LIQ_THRESHOLD) {
                            setEvents(prev => [liq, ...prev].slice(0, maxEvents));
                            setStats(prev => ({
                                count: prev.count + 1,
                                totalUsd: prev.totalUsd + liq.usdValue
                            }));
                        }
                    } catch { }
                };

                ws.onclose = () => {
                    setConnected(false);
                    setTimeout(connect, 3000); // Reconnect
                };

                ws.onerror = () => {
                    ws.close();
                };
            } catch {
                setConnected(false);
            }
        };

        connect();

        // Demo mode: simulate events if WS fails
        const demoInterval = setInterval(() => {
            if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
                const mockLiq = generateMockLiq();
                if (mockLiq.usdValue >= LIQ_THRESHOLD) {
                    setEvents(prev => [mockLiq, ...prev].slice(0, maxEvents));
                    setStats(prev => ({
                        count: prev.count + 1,
                        totalUsd: prev.totalUsd + mockLiq.usdValue
                    }));
                }
            }
        }, 2500);

        return () => {
            wsRef.current?.close();
            clearInterval(demoInterval);
        };
    }, []);

    const filtered = events
        .filter(e => selectedExchanges.includes(e.exchange))
        .filter(e => sideFilter === 'all' || e.side === sideFilter)
        .filter(e => e.usdValue >= minSize);

    const longVolume = events.filter(e => e.side === 'LONG').reduce((s, e) => s + e.usdValue, 0);
    const shortVolume = events.filter(e => e.side === 'SHORT').reduce((s, e) => s + e.usdValue, 0);
    const sentiment = longVolume > shortVolume * 1.3 ? '🔴 Давят Лонги' : shortVolume > longVolume * 1.3 ? '🟢 Давят Шорты' : '⚪ Нейтраль';

    return (
        <div style={{ padding: '30px', fontFamily: "'Inter', sans-serif" }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                        <Flame size={22} color="#FF5722" />
                        <h2 style={{ margin: 0, fontWeight: '900', fontSize: '1.6rem', color: '#fff' }}>Post-Liquidation</h2>
                        <span style={{
                            background: connected ? 'rgba(76,175,80,0.12)' : 'rgba(255,87,34,0.12)',
                            border: `1px solid ${connected ? 'rgba(76,175,80,0.3)' : 'rgba(255,87,34,0.3)'}`,
                            color: connected ? '#4CAF50' : '#FF5722',
                            fontSize: '0.72rem', fontWeight: '800', padding: '3px 10px', borderRadius: '20px',
                            display: 'flex', alignItems: 'center', gap: '5px'
                        }}>
                            <span style={{
                                width: '6px', height: '6px', borderRadius: '50%',
                                background: connected ? '#4CAF50' : '#FF5722',
                                animation: connected ? 'liqPulse 1s infinite' : 'none'
                            }} />
                            {connected ? 'LIVE' : 'DEMO'}
                        </span>
                    </div>
                    <p style={{ color: '#555', margin: 0, fontSize: '0.85rem' }}>
                        {stats.count} событий • Итого: {formatUSD(stats.totalUsd)}
                        {' • '}{sentiment}
                    </p>
                </div>
            </div>

            {/* Stats Bar */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px'
            }}>
                {[
                    { label: 'Ликвидации лонгов', value: formatUSD(longVolume), color: '#FF5722' },
                    { label: 'Ликвидации шортов', value: formatUSD(shortVolume), color: '#4CAF50' },
                    { label: 'Всего за сессию', value: formatUSD(stats.totalUsd), color: '#FFD700' },
                ].map(s => (
                    <div key={s.label} style={{
                        padding: '16px 20px', background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.05)', borderRadius: '14px'
                    }}>
                        <div style={{ fontSize: '0.72rem', color: '#555', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>{s.label}</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '900', color: s.color }}>{s.value}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div style={{
                display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center',
                padding: '14px 18px', background: 'rgba(255,255,255,0.02)',
                borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)'
            }}>
                {EXCHANGES.map(ex => (
                    <button key={ex} onClick={() => setSelectedExchanges(prev =>
                        prev.includes(ex) ? prev.filter(e => e !== ex) : [...prev, ex]
                    )} style={{
                        padding: '6px 12px', borderRadius: '8px', cursor: 'pointer',
                        fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase',
                        border: `1px solid ${selectedExchanges.includes(ex) ? 'rgba(255,87,34,0.4)' : 'rgba(255,255,255,0.06)'}`,
                        background: selectedExchanges.includes(ex) ? 'rgba(255,87,34,0.1)' : 'transparent',
                        color: selectedExchanges.includes(ex) ? '#FF5722' : '#555',
                    }}>{ex}</button>
                ))}
                <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.06)' }} />
                {[['all', 'Все'], ['LONG', '🔴 Лонги'], ['SHORT', '🟢 Шорты']].map(([v, l]) => (
                    <button key={v} onClick={() => setSideFilter(v)} style={{
                        padding: '6px 12px', borderRadius: '8px', cursor: 'pointer',
                        fontSize: '0.75rem', fontWeight: '800',
                        border: `1px solid ${sideFilter === v ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)'}`,
                        background: sideFilter === v ? 'rgba(255,255,255,0.08)' : 'transparent',
                        color: sideFilter === v ? '#fff' : '#555',
                    }}>{l}</button>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                    <span style={{ color: '#555', fontSize: '0.75rem', fontWeight: '700' }}>Мин. $</span>
                    <select value={minSize} onChange={e => setMinSize(Number(e.target.value))} style={{
                        padding: '6px 10px', borderRadius: '8px', cursor: 'pointer',
                        border: '1px solid rgba(255,255,255,0.08)',
                        background: 'rgba(255,255,255,0.04)',
                        color: '#bbb', fontWeight: '700', fontSize: '0.78rem'
                    }}>
                        <option value={50_000}>$50K+</option>
                        <option value={100_000}>$100K+</option>
                        <option value={500_000}>$500K+</option>
                        <option value={1_000_000}>$1M+</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                            <th style={th}>Пара</th>
                            <th style={th}>Тип</th>
                            <th style={th}>Размер</th>
                            <th style={th}>Цена</th>
                            <th style={th}>Время</th>
                            <th style={th}>Сигнал</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ padding: '60px', textAlign: 'center', color: '#444' }}>
                                    <Flame size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
                                    <div style={{ fontWeight: '700' }}>Ожидаю ликвидации...</div>
                                    <div style={{ fontSize: '0.8rem', marginTop: '6px' }}>Данные появятся автоматически</div>
                                </td>
                            </tr>
                        ) : (
                            <AnimatePresence>
                                {filtered.map((item, idx) => (
                                    <LiqRow key={item.id} item={item} idx={idx} />
                                ))}
                            </AnimatePresence>
                        )}
                    </tbody>
                </table>
            </div>

            <style>{`
                @keyframes liqPulse {
                    0% { transform: scale(1); opacity: 0.6; }
                    70% { transform: scale(2); opacity: 0; }
                    100% { transform: scale(1); opacity: 0; }
                }
            `}</style>
        </div>
    );
};

export default LiquidationScreener;
