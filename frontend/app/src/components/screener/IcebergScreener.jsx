import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, RefreshCw, Clock, Box, TrendingUp, TrendingDown, Target } from 'lucide-react';

const EXCHANGES = ['binance', 'bybit', 'mexc'];

const fmtPrice = (p) => {
    if (!p) return '–';
    if (p >= 1000) return p.toLocaleString('en-US', { maximumFractionDigits: 1 });
    if (p >= 1) return p.toFixed(4);
    return p.toFixed(8);
};

const fmtVol = (v) => {
    if (!v) return '–';
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
    return `$${v.toFixed(0)}`;
};

const genMockIcebergs = () => {
    const symbols = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'PEPE/USDT'];
    const exchanges = ['binance', 'bybit', 'mexc'];

    return symbols.map((sym, idx) => {
        const hiddenVol = Math.random() * 500000 + 50000;
        const filledVol = hiddenVol * (Math.random() * 0.4);
        return {
            id: `ice-${idx}`,
            symbol: sym,
            exchange: exchanges[idx % exchanges.length],
            side: Math.random() > 0.5 ? 'BUY' : 'SELL',
            hiddenVolume: hiddenVol,
            filledVolume: filledVol,
            price: Math.random() * 50000,
            confidence: Math.round(75 + Math.random() * 20),
            timestamp: Date.now() / 1000,
        };
    }).sort((a, b) => b.hiddenVolume - a.hiddenVolume);
};

const th = { padding: '12px 14px', fontSize: '0.67rem', fontWeight: '800', color: '#444', textTransform: 'uppercase', letterSpacing: '0.8px', textAlign: 'left' };
const td = { padding: '16px 14px', color: '#e0e0e0', verticalAlign: 'middle' };

const IcebergScreener = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            setError(null);
            const res = await fetch('/api/screener/iceberg');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            if (json.success) {
                setData(json.icebergs || []);
                setLastUpdate(new Date().toLocaleTimeString());
                return;
            }
            throw new Error('API error');
        } catch (e) {
            setError(e.message);
            setData(genMockIcebergs());
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 20_000);
        return () => clearInterval(interval);
    }, [fetchData]);

    return (
        <div style={{ padding: '30px', fontFamily: "'Inter', sans-serif" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                        <Eye size={22} color="#b2bec3" />
                        <h2 style={{ margin: 0, fontWeight: '900', fontSize: '1.6rem', color: '#fff' }}>Iceberg Hunter</h2>
                        <span style={{
                            background: 'rgba(178,190,195,0.12)',
                            border: '1px solid rgba(178,190,195,0.3)',
                            color: '#b2bec3',
                            fontSize: '0.72rem',
                            fontWeight: '800',
                            padding: '3px 10px',
                            borderRadius: '20px'
                        }}>
                            СКРЫТЫЕ ОРДЕРА
                        </span>
                    </div>
                    <p style={{ color: '#555', margin: 0, fontSize: '0.85rem' }}>
                        {lastUpdate && <><Clock size={11} style={{ verticalAlign: 'middle', marginRight: '5px' }} />Обновлено: {lastUpdate} • </>}
                        Обнаружено {data.length} подозрительных объёмов
                    </p>
                </div>
                <button onClick={fetchData} disabled={loading} style={{
                    padding: '8px 14px', borderRadius: '10px', cursor: 'pointer',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.04)', color: '#aaa',
                    fontWeight: '700', fontSize: '0.78rem'
                }}>
                    <RefreshCw size={13} style={{ verticalAlign: 'middle', marginRight: '5px', animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                    Обновить
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '30px' }}>
                <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#4CAF50', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <TrendingUp size={14} /> ТЕКУЩИЕ BID ICEBERGS
                    </div>
                    {data.filter(i => i.side === 'BUY').slice(0, 3).map(item => (
                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <div style={{ fontWeight: '800', color: '#fff' }}>{item.symbol}</div>
                            <div style={{ color: '#4CAF50', fontWeight: '900' }}>{fmtVol(item.hiddenVolume)}</div>
                        </div>
                    ))}
                </div>
                <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#FF5722', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <TrendingDown size={14} /> ТЕКУЩИЕ ASK ICEBERGS
                    </div>
                    {data.filter(i => i.side === 'SELL').slice(0, 3).map(item => (
                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <div style={{ fontWeight: '800', color: '#fff' }}>{item.symbol}</div>
                            <div style={{ color: '#FF5722', fontWeight: '900' }}>{fmtVol(item.hiddenVolume)}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ overflowX: 'auto', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.87rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                            <th style={th}>Тикер</th>
                            <th style={th}>Сторона</th>
                            <th style={th}>Цена</th>
                            <th style={th}>Скрытый объём</th>
                            <th style={th}>Прогресс</th>
                            <th style={th}>Точность</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && !data.length ? (
                            <tr><td colSpan="6" style={{ padding: '60px', textAlign: 'center', color: '#444' }}>
                                <Target size={24} style={{ animation: 'scan 2s infinite ease-in-out', marginBottom: '12px' }} />
                                <div style={{ fontWeight: '700' }}>Анализ статического сопротивления...</div>
                            </td></tr>
                        ) : data.length === 0 ? (
                            <tr><td colSpan="6" style={{ padding: '60px', textAlign: 'center', color: '#444' }}>Скрытых ордеров не обнаружено</td></tr>
                        ) : (
                            <AnimatePresence>
                                {data.map((item, idx) => {
                                    const progress = (item.filledVolume / item.hiddenVolume) * 100;
                                    return (
                                        <motion.tr
                                            key={item.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: idx * 0.02 }}
                                            style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <td style={td}>
                                                <div style={{ fontWeight: '800', color: '#fff' }}>{item.symbol}</div>
                                                <div style={{ fontSize: '0.7rem', color: '#555', textTransform: 'uppercase' }}>{item.exchange}</div>
                                            </td>
                                            <td style={td}>
                                                <span style={{
                                                    padding: '3px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '900',
                                                    background: item.side === 'BUY' ? 'rgba(76,175,80,0.1)' : 'rgba(255,87,34,0.1)',
                                                    color: item.side === 'BUY' ? '#4CAF50' : '#FF5722',
                                                    border: `1px solid ${item.side === 'BUY' ? 'rgba(76,175,80,0.2)' : 'rgba(255,87,34,0.2)'}`
                                                }}>
                                                    {item.side}
                                                </span>
                                            </td>
                                            <td style={td}><div style={{ fontWeight: '700' }}>${fmtPrice(item.price)}</div></td>
                                            <td style={td}>
                                                <div style={{ fontWeight: '800', color: '#fff' }}>{fmtVol(item.hiddenVolume)}</div>
                                                <div style={{ fontSize: '0.7rem', color: '#555' }}>Исполнено: {fmtVol(item.filledVolume)}</div>
                                            </td>
                                            <td style={td}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ width: '80px', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                                                        <div style={{ width: `${progress}%`, height: '100%', background: item.side === 'BUY' ? '#4CAF50' : '#FF5722' }} />
                                                    </div>
                                                    <span style={{ fontSize: '0.7rem', color: '#555', fontWeight: '700' }}>{progress.toFixed(0)}%</span>
                                                </div>
                                            </td>
                                            <td style={td}>
                                                <div style={{
                                                    padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '800',
                                                    background: item.confidence > 90 ? 'rgba(255,215,0,0.1)' : 'rgba(255,255,255,0.04)',
                                                    border: item.confidence > 90 ? '1px solid rgba(255,215,0,0.3)' : '1px solid rgba(255,255,255,0.06)',
                                                    color: item.confidence > 90 ? '#FFD700' : '#888'
                                                }}>
                                                    {item.confidence}%
                                                </div>
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </AnimatePresence>
                        )}
                    </tbody>
                </table>
            </div>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes scan { 
                    0% { transform: scale(1); opacity: 0.4; filter: blur(0px); } 
                    50% { transform: scale(1.1); opacity: 1; filter: blur(1px); } 
                    100% { transform: scale(1); opacity: 0.4; filter: blur(0px); } 
                }
            `}</style>
        </div>
    );
};

export default IcebergScreener;
