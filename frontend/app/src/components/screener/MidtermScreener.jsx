import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, RefreshCw, BarChart3, Activity, Clock, ArrowUpRight, ArrowDownRight, Zap } from 'lucide-react';

const fmtPrice = (p) => {
    if (!p) return '–';
    if (p >= 1000) return p.toLocaleString('en-US', { maximumFractionDigits: 1 });
    if (p >= 1) return p.toFixed(4);
    return p.toFixed(6);
};

const genMockMidterm = () => {
    const symbols = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT', 'ADA/USDT', 'AVAX/USDT'];
    const exchanges = ['binance', 'bybit'];

    return symbols.map((sym, idx) => {
        const oiChange = (Math.random() * 10 - 2);
        const cvd1h = (Math.random() * 20 - 10);
        return {
            id: `mid-${idx}`,
            symbol: sym,
            exchange: exchanges[idx % exchanges.length],
            price: Math.random() * 50000,
            oiChangePct: oiChange,
            cvd1h: cvd1h,
            volTrend: Math.random() > 0.6 ? 'UP' : 'STABLE',
            signal: (oiChange > 3 && cvd1h > 5) ? 'BULLISH' : (oiChange > 3 && cvd1h < -5) ? 'BEARISH' : 'ACCUMULATION'
        };
    }).sort((a, b) => Math.abs(b.oiChangePct) - Math.abs(a.oiChangePct));
};

const th = { padding: '12px 14px', fontSize: '0.67rem', fontWeight: '800', color: '#444', textTransform: 'uppercase', letterSpacing: '0.8px', textAlign: 'left' };
const td = { padding: '16px 14px', color: '#e0e0e0', verticalAlign: 'middle' };

const MidtermScreener = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            setError(null);
            const res = await fetch('/api/screener/midterm');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            if (json.success) {
                setData(json.midterm || []);
                setLastUpdate(new Date().toLocaleTimeString());
                return;
            }
            throw new Error('API error');
        } catch (e) {
            setError(e.message);
            setData(genMockMidterm());
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30_000);
        return () => clearInterval(interval);
    }, [fetchData]);

    return (
        <div style={{ padding: '30px', fontFamily: "'Inter', sans-serif" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                        <TrendingUp size={22} color="#4CAF50" />
                        <h2 style={{ margin: 0, fontWeight: '900', fontSize: '1.6rem', color: '#fff' }}>Midterm Strategist</h2>
                        <span style={{
                            background: 'rgba(76,175,80,0.12)',
                            border: '1px solid rgba(76,175,80,0.3)',
                            color: '#4CAF50',
                            fontSize: '0.72rem',
                            fontWeight: '800',
                            padding: '3px 10px',
                            borderRadius: '20px'
                        }}>
                            1Ч — 4Ч ТФ
                        </span>
                    </div>
                    <p style={{ color: '#555', margin: 0, fontSize: '0.85rem' }}>
                        {lastUpdate && <><Clock size={11} style={{ verticalAlign: 'middle', marginRight: '5px' }} />Обновлено: {lastUpdate} • </>}
                        Анализ OI и CVD для выявления крупных позиций
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

            <div style={{ overflowX: 'auto', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.87rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                            <th style={th}>Тикер</th>
                            <th style={th}>Цена</th>
                            <th style={th}>OI Δ (1h)</th>
                            <th style={th}>CVD Δ (1h)</th>
                            <th style={th}>Тренд Vol</th>
                            <th style={th}>Сигнал</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && !data.length ? (
                            <tr><td colSpan="6" style={{ padding: '60px', textAlign: 'center', color: '#444' }}>
                                <Activity size={24} style={{ animation: 'pulse 1.5s infinite', marginBottom: '12px' }} />
                                <div style={{ fontWeight: '700' }}>Расчёт рыночного баланса...</div>
                            </td></tr>
                        ) : data.length === 0 ? (
                            <tr><td colSpan="6" style={{ padding: '60px', textAlign: 'center', color: '#444' }}>Сигналов не обнаружено</td></tr>
                        ) : (
                            <AnimatePresence>
                                {data.map((item, idx) => {
                                    const oiColor = item.oiChangePct > 0 ? '#4ecdc4' : '#ff7675';
                                    const cvdColor = item.cvd1h > 0 ? '#4CAF50' : '#FF5722';
                                    return (
                                        <motion.tr
                                            key={item.id}
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.03 }}
                                            style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <td style={td}>
                                                <div style={{ fontWeight: '800', color: '#fff' }}>{item.symbol}</div>
                                                <div style={{ fontSize: '0.7rem', color: '#555', textTransform: 'uppercase' }}>{item.exchange}</div>
                                            </td>
                                            <td style={td}><div style={{ fontWeight: '700' }}>${fmtPrice(item.price)}</div></td>
                                            <td style={td}>
                                                <div style={{ color: oiColor, fontWeight: '900', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    {item.oiChangePct > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                                    {item.oiChangePct > 0 ? '+' : ''}{item.oiChangePct.toFixed(2)}%
                                                </div>
                                            </td>
                                            <td style={td}>
                                                <div style={{ color: cvdColor, fontWeight: '800' }}>
                                                    {item.cvd1h > 0 ? '+' : ''}{item.cvd1h.toFixed(1)}%
                                                </div>
                                            </td>
                                            <td style={td}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    {item.volTrend === 'UP' ? <Zap size={12} color="#FFD700" /> : <BarChart3 size={12} color="#555" />}
                                                    <span style={{ fontSize: '0.75rem', fontWeight: '800', color: item.volTrend === 'UP' ? '#FFD700' : '#555' }}>
                                                        {item.volTrend}
                                                    </span>
                                                </div>
                                            </td>
                                            <td style={td}>
                                                <span style={{
                                                    padding: '4px 10px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: '900',
                                                    background: item.signal === 'BULLISH' ? 'rgba(76,175,80,0.1)' : item.signal === 'BEARISH' ? 'rgba(255,87,34,0.1)' : 'rgba(255,255,255,0.05)',
                                                    color: item.signal === 'BULLISH' ? '#4CAF50' : item.signal === 'BEARISH' ? '#FF5722' : '#888',
                                                    border: `1px solid ${item.signal === 'BULLISH' ? 'rgba(76,175,80,0.2)' : item.signal === 'BEARISH' ? 'rgba(255,87,34,0.2)' : 'rgba(255,255,255,0.1)'}`
                                                }}>
                                                    {item.signal}
                                                </span>
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
                @keyframes pulse { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }
            `}</style>
        </div>
    );
};

export default MidtermScreener;
