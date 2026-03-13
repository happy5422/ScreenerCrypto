import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, RefreshCw, Filter, TrendingUp, TrendingDown, Activity, Clock } from 'lucide-react';

const EXCHANGES = ['binance', 'bybit', 'mexc'];

const SIGNAL_COLORS = {
    STRONG_LONG: '#00c853',
    LONG: '#4CAF50',
    NEUTRAL: '#888',
    SHORT: '#FF5722',
    STRONG_SHORT: '#b71c1c',
};

const SIGNAL_LABELS = {
    STRONG_LONG: '🔥 ЛОНГ',
    LONG: '📈 Лонг',
    NEUTRAL: '⚪ Нейтрал',
    SHORT: '📉 Шорт',
    STRONG_SHORT: '🔥 ШОРТ',
};

const formatPrice = (p) => {
    if (!p) return '–';
    if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    if (p >= 1) return p.toFixed(4);
    return p.toFixed(6);
};

const formatVolume = (v) => {
    if (!v) return '–';
    if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
    return `$${v.toFixed(0)}`;
};

const ScalpRow = ({ item, idx }) => {
    const sigColor = SIGNAL_COLORS[item.signal] || '#888';
    const sigLabel = SIGNAL_LABELS[item.signal] || '–';
    const changeColor = item.change >= 0 ? '#4CAF50' : '#FF5722';

    return (
        <motion.tr
            key={item.symbol}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.02 }}
            style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
            <td style={td}>
                <div style={{ fontWeight: '800', color: '#fff', fontSize: '0.9rem' }}>
                    {item.symbol.split('/')[0]}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#555', textTransform: 'uppercase', marginTop: '2px' }}>
                    {item.exchange}
                </div>
            </td>
            <td style={td}>
                <div style={{ fontWeight: '700', color: '#e0e0e0' }}>${formatPrice(item.price)}</div>
                <div style={{ fontSize: '0.73rem', color: changeColor, fontWeight: '700' }}>
                    {item.change >= 0 ? '+' : ''}{item.change?.toFixed(2)}%
                </div>
            </td>
            <td style={td}>
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    padding: '4px 10px', borderRadius: '20px',
                    background: `${sigColor}18`, border: `1px solid ${sigColor}35`,
                    color: sigColor, fontWeight: '800', fontSize: '0.76rem', whiteSpace: 'nowrap'
                }}>
                    {sigLabel}
                </div>
            </td>
            <td style={td}>
                <div style={{
                    fontWeight: '700', fontSize: '0.85rem',
                    color: item.cvd >= 0 ? '#4CAF50' : '#FF5722'
                }}>
                    {item.cvd >= 0 ? '+' : ''}{item.cvd?.toFixed(1)}%
                </div>
            </td>
            <td style={td}>
                <div style={{
                    fontWeight: '700', fontSize: '0.85rem',
                    color: item.obImbalance >= 50 ? '#4CAF50' : '#FF5722'
                }}>
                    {item.obImbalance?.toFixed(0)}%
                    <span style={{ color: '#444', fontWeight: '400', fontSize: '0.7rem', marginLeft: '4px' }}>
                        {item.obImbalance >= 50 ? 'bid' : 'ask'}
                    </span>
                </div>
            </td>
            <td style={td}>
                <div style={{
                    color: item.volSpike >= 3 ? '#FFD700' : item.volSpike >= 1.5 ? '#FF9800' : '#666',
                    fontWeight: item.volSpike >= 2 ? '800' : '600',
                    fontSize: '0.85rem'
                }}>
                    {item.volSpike >= 1.5 && '🔥 '}{item.volSpike?.toFixed(1)}x
                </div>
            </td>
            <td style={td}>
                <div style={{ color: '#888', fontSize: '0.82rem' }}>{formatVolume(item.volume5m)}</div>
            </td>
            <td style={td}>
                <div style={{ color: '#555', fontSize: '0.75rem' }}>
                    {item.funding >= 0 ? '+' : ''}{(item.funding * 100)?.toFixed(4)}%
                </div>
            </td>
        </motion.tr>
    );
};

const th = {
    padding: '12px 14px',
    fontSize: '0.68rem',
    fontWeight: '800',
    color: '#444',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    textAlign: 'left',
    whiteSpace: 'nowrap'
};

const td = {
    padding: '13px 14px',
    color: '#e0e0e0',
    verticalAlign: 'middle'
};

const ScalpingScreener = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [minVolSpike, setMinVolSpike] = useState(1.5);
    const [signalFilter, setSignalFilter] = useState('all');
    const [selectedExchanges, setSelectedExchanges] = useState(EXCHANGES);
    const [error, setError] = useState(null);
    const intervalRef = useRef(null);

    const fetchData = useCallback(async () => {
        try {
            setError(null);
            const params = new URLSearchParams({ min_vol_spike: minVolSpike });
            const res = await fetch(`/api/screener/scalping?${params}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            if (json.success) {
                setData(json.opportunities || []);
                setLastUpdate(new Date().toLocaleTimeString());
            }
        } catch (e) {
            setError(e.message);
            // Fallback to mock data for demo
            setData(generateMockData());
        } finally {
            setLoading(false);
        }
    }, [minVolSpike]);

    // Generate mock data for demo when backend is not ready
    const generateMockData = () => {
        const symbols = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'ARB/USDT',
            'DOGE/USDT', 'SUI/USDT', 'WIF/USDT', 'PEPE/USDT', 'ADA/USDT',
            'AVAX/USDT', 'TRX/USDT', 'LINK/USDT', 'NEAR/USDT', 'INJ/USDT'];
        const exchanges = ['binance', 'bybit', 'mexc'];
        const signals = ['STRONG_LONG', 'LONG', 'NEUTRAL', 'SHORT', 'STRONG_SHORT'];

        return symbols.map((sym) => ({
            symbol: sym,
            exchange: exchanges[Math.floor(Math.random() * exchanges.length)],
            price: Math.random() * 10000 + 0.5,
            change: (Math.random() - 0.45) * 8,
            signal: signals[Math.floor(Math.random() * signals.length)],
            cvd: (Math.random() - 0.45) * 15,
            obImbalance: Math.random() * 100,
            volSpike: Math.random() * 5 + 0.5,
            volume5m: Math.random() * 5_000_000,
            funding: (Math.random() - 0.5) * 0.002,
        }));
    };

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (autoRefresh) {
            intervalRef.current = setInterval(fetchData, 5000);
        } else {
            clearInterval(intervalRef.current);
        }
        return () => clearInterval(intervalRef.current);
    }, [autoRefresh, fetchData]);

    const filtered = data
        .filter(d => selectedExchanges.includes(d.exchange))
        .filter(d => signalFilter === 'all' || d.signal === signalFilter)
        .filter(d => d.volSpike >= minVolSpike)
        .sort((a, b) => b.volSpike - a.volSpike);

    return (
        <div style={{ padding: '30px', fontFamily: "'Inter', sans-serif" }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                        <Zap size={22} color="#FFD700" />
                        <h2 style={{ margin: 0, fontWeight: '900', fontSize: '1.6rem', color: '#fff' }}>Скальпинг</h2>
                        <span style={{
                            background: 'rgba(255,215,0,0.12)', border: '1px solid rgba(255,215,0,0.3)',
                            color: '#FFD700', fontSize: '0.72rem', fontWeight: '800',
                            padding: '3px 10px', borderRadius: '20px'
                        }}>
                            {'<'} 15 МИН
                        </span>
                    </div>
                    <p style={{ color: '#555', margin: 0, fontSize: '0.85rem' }}>
                        {lastUpdate && <><Clock size={11} style={{ verticalAlign: 'middle', marginRight: '5px' }} />Обновлено: {lastUpdate}{' • '}</>}
                        {filtered.length} пар
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        style={{
                            padding: '8px 14px', borderRadius: '10px', cursor: 'pointer',
                            border: '1px solid rgba(255,255,255,0.08)',
                            background: autoRefresh ? 'rgba(76, 175, 80, 0.15)' : 'rgba(255,255,255,0.04)',
                            color: autoRefresh ? '#4CAF50' : '#777',
                            fontWeight: '700', fontSize: '0.78rem'
                        }}
                    >
                        <Activity size={13} style={{ verticalAlign: 'middle', marginRight: '5px' }} />
                        Live {autoRefresh ? 'ON' : 'OFF'}
                    </button>
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        style={{
                            padding: '8px 14px', borderRadius: '10px', cursor: loading ? 'wait' : 'pointer',
                            border: '1px solid rgba(255,255,255,0.08)',
                            background: 'rgba(255,255,255,0.04)',
                            color: '#aaa', fontWeight: '700', fontSize: '0.78rem'
                        }}
                    >
                        <RefreshCw size={13} style={{ verticalAlign: 'middle', marginRight: '5px', animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div style={{
                display: 'flex', gap: '12px', marginBottom: '20px',
                padding: '16px 20px', background: 'rgba(255,255,255,0.02)',
                borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)',
                flexWrap: 'wrap', alignItems: 'center'
            }}>
                {/* Exchanges */}
                <div style={{ display: 'flex', gap: '6px' }}>
                    {EXCHANGES.map(ex => (
                        <button
                            key={ex}
                            onClick={() => setSelectedExchanges(prev =>
                                prev.includes(ex) ? prev.filter(e => e !== ex) : [...prev, ex]
                            )}
                            style={{
                                padding: '6px 12px', borderRadius: '8px', cursor: 'pointer',
                                border: '1px solid', fontSize: '0.75rem', fontWeight: '800',
                                textTransform: 'uppercase',
                                borderColor: selectedExchanges.includes(ex) ? 'rgba(78,205,196,0.5)' : 'rgba(255,255,255,0.06)',
                                background: selectedExchanges.includes(ex) ? 'rgba(78,205,196,0.12)' : 'transparent',
                                color: selectedExchanges.includes(ex) ? '#4ecdc4' : '#555',
                            }}
                        >{ex}</button>
                    ))}
                </div>
                <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.06)' }} />
                {/* Signal filter */}
                <select
                    value={signalFilter}
                    onChange={e => setSignalFilter(e.target.value)}
                    style={{
                        padding: '7px 12px', borderRadius: '8px', cursor: 'pointer',
                        border: '1px solid rgba(255,255,255,0.08)',
                        background: 'rgba(255,255,255,0.04)',
                        color: '#bbb', fontWeight: '700', fontSize: '0.78rem'
                    }}
                >
                    <option value="all">Все сигналы</option>
                    <option value="STRONG_LONG">🔥 Сильный лонг</option>
                    <option value="LONG">📈 Лонг</option>
                    <option value="NEUTRAL">⚪ Нейтрал</option>
                    <option value="SHORT">📉 Шорт</option>
                    <option value="STRONG_SHORT">🔥 Сильный шорт</option>
                </select>
                {/* Vol spike filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Filter size={13} color="#555" />
                    <span style={{ color: '#555', fontSize: '0.76rem', fontWeight: '700' }}>Всплеск ≥</span>
                    <input
                        type="number" min="1" max="10" step="0.5"
                        value={minVolSpike}
                        onChange={e => setMinVolSpike(parseFloat(e.target.value) || 1)}
                        style={{
                            width: '60px', padding: '6px 8px', borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.08)',
                            background: 'rgba(255,255,255,0.04)',
                            color: '#fff', fontWeight: '700', fontSize: '0.8rem'
                        }}
                    />
                    <span style={{ color: '#555', fontSize: '0.76rem' }}>x</span>
                </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                            <th style={th}>Пара</th>
                            <th style={th}>Цена / Изм.</th>
                            <th style={th}>Сигнал</th>
                            <th style={th}>CVD Δ</th>
                            <th style={th}>OB Imbalance</th>
                            <th style={th}>Vol Spike</th>
                            <th style={th}>Vol 5м</th>
                            <th style={th}>Funding</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && !data.length ? (
                            <tr>
                                <td colSpan="8" style={{ padding: '60px', textAlign: 'center', color: '#444' }}>
                                    <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
                                    <div style={{ fontSize: '0.85rem', fontWeight: '700' }}>Загрузка данных...</div>
                                </td>
                            </tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan="8" style={{ padding: '60px', textAlign: 'center', color: '#444' }}>
                                    Нет данных по фильтрам
                                </td>
                            </tr>
                        ) : (
                            <AnimatePresence>
                                {filtered.map((item, idx) => (
                                    <ScalpRow key={`${item.symbol}-${item.exchange}`} item={item} idx={idx} />
                                ))}
                            </AnimatePresence>
                        )}
                    </tbody>
                </table>
            </div>

            {error && (
                <div style={{ marginTop: '12px', color: '#FF9800', fontSize: '0.78rem', textAlign: 'center' }}>
                    ⚠️ API недоступен — показаны демо-данные
                </div>
            )}

            <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
        </div>
    );
};

export default ScalpingScreener;
