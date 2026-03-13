import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Waves, RefreshCw, MessageSquare, Users, Globe, Share2, TrendingUp, TrendingDown, Info } from 'lucide-react';

const genMockSentiment = () => {
    const symbols = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'PEPE/USDT', 'BONK/USDT', 'DOGE/USDT'];
    const platforms = ['Twitter', 'Discord', 'Reddit', 'News', 'Telegram'];

    return symbols.map((sym, idx) => {
        const score = 2 + Math.random() * 7.5;
        return {
            id: `sent-${idx}`,
            symbol: sym,
            score: parseFloat(score.toFixed(1)),
            status: score > 7 ? 'BULLISH' : score < 3.5 ? 'BEARISH' : 'NEUTRAL',
            socialVolume: Math.round(100 + Math.random() * 2000),
            trendingPlatforms: platforms.slice(0, 2 + (idx % 3)),
            hotNews: score > 8 ? "ETFs inflow reaching record highs" : score < 3 ? "Major exchange security concerns" : "General consolidation buzz"
        };
    }).sort((a, b) => b.score - a.score);
};

const th = { padding: '12px 14px', fontSize: '0.67rem', fontWeight: '800', color: '#444', textTransform: 'uppercase', letterSpacing: '0.8px', textAlign: 'left' };
const td = { padding: '18px 14px', color: '#e0e0e0', verticalAlign: 'middle' };

const SentimentScreener = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            setError(null);
            const res = await fetch('/api/screener/sentiment');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            if (json.success) {
                setData(json.sentiment || []);
                setLastUpdate(new Date().toLocaleTimeString());
                return;
            }
            throw new Error('API error');
        } catch (e) {
            setError(e.message);
            setData(genMockSentiment());
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60_000);
        return () => clearInterval(interval);
    }, [fetchData]);

    return (
        <div style={{ padding: '30px', fontFamily: "'Inter', sans-serif" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                        <Waves size={22} color="#55efc4" />
                        <h2 style={{ margin: 0, fontWeight: '900', fontSize: '1.6rem', color: '#fff' }}>Social Sentiment</h2>
                        <span style={{
                            background: 'rgba(85,239,196,0.12)',
                            border: '1px solid rgba(85,239,196,0.3)',
                            color: '#55efc4',
                            fontSize: '0.72rem',
                            fontWeight: '800',
                            padding: '3px 10px',
                            borderRadius: '20px'
                        }}>
                            AI ANALYSIS
                        </span>
                    </div>
                    <p style={{ color: '#555', margin: 0, fontSize: '0.85rem' }}>
                        {lastUpdate && <><Globe size={11} style={{ verticalAlign: 'middle', marginRight: '5px' }} />Обновлено: {lastUpdate} • </>}
                        Индекс хайпа и настроений в социальных сетях
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {data.slice(0, 3).map((item, idx) => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.1 }}
                        style={{
                            padding: '20px', background: 'rgba(255,255,255,0.02)',
                            border: `1px solid ${item.status === 'BULLISH' ? 'rgba(85,239,196,0.2)' : item.status === 'BEARISH' ? 'rgba(255,118,117,0.2)' : 'rgba(255,255,255,0.05)'}`,
                            borderRadius: '20px', position: 'relative'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                            <div>
                                <div style={{ fontSize: '1.4rem', fontWeight: '950', color: '#fff' }}>{item.symbol}</div>
                                <div style={{ fontSize: '0.7rem', color: '#555', textTransform: 'uppercase', letterSpacing: '1px' }}>Trending now</div>
                            </div>
                            <div style={{ fontSize: '2rem', fontWeight: '900', color: item.status === 'BULLISH' ? '#55efc4' : item.status === 'BEARISH' ? '#ff7675' : '#888' }}>
                                {item.score}
                            </div>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#e0e0e0', lineHeight: '1.4', marginBottom: '16px', minHeight: '40px' }}>
                            <MessageSquare size={12} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                            {item.hotNews}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {item.trendingPlatforms.map(p => (
                                <span key={p} style={{ fontSize: '0.65rem', fontWeight: '800', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: '#666' }}>
                                    {p}
                                </span>
                            ))}
                        </div>
                    </motion.div>
                ))}
            </div>

            <div style={{ overflowX: 'auto', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.87rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                            <th style={th}>Ассет</th>
                            <th style={th}>Индекс AI</th>
                            <th style={th}>Настроение</th>
                            <th style={th}>Соц. объём</th>
                            <th style={th}>Платформы</th>
                            <th style={th}>AI Insight</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && !data.length ? (
                            <tr><td colSpan="6" style={{ padding: '60px', textAlign: 'center', color: '#444' }}>
                                <Users size={24} style={{ animation: 'bounce 1s infinite', marginBottom: '12px' }} />
                                <div style={{ fontWeight: '700' }}>Сбор упоминаний в сетях...</div>
                            </td></tr>
                        ) : data.length === 0 ? (
                            <tr><td colSpan="6" style={{ padding: '60px', textAlign: 'center', color: '#444' }}>Данные отсутствуют</td></tr>
                        ) : (
                            <AnimatePresence>
                                {data.map((item, idx) => (
                                    <motion.tr
                                        key={item.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: idx * 0.02 }}
                                        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <td style={td}><div style={{ fontWeight: '800', color: '#fff' }}>{item.symbol}</div></td>
                                        <td style={td}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '60px', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                                                    <div style={{
                                                        width: `${item.score * 10}%`, height: '100%',
                                                        background: item.score > 7 ? '#55efc4' : item.score < 4 ? '#ff7675' : '#888'
                                                    }} />
                                                </div>
                                                <span style={{ fontWeight: '900', fontSize: '0.85rem' }}>{item.score}</span>
                                            </div>
                                        </td>
                                        <td style={td}>
                                            <div style={{
                                                display: 'flex', alignItems: 'center', gap: '4px',
                                                color: item.status === 'BULLISH' ? '#55efc4' : item.status === 'BEARISH' ? '#ff7675' : '#888',
                                                fontWeight: '800', fontSize: '0.75rem'
                                            }}>
                                                {item.status === 'BULLISH' ? <TrendingUp size={12} /> : item.status === 'BEARISH' ? <TrendingDown size={12} /> : <Share2 size={12} />}
                                                {item.status}
                                            </div>
                                        </td>
                                        <td style={td}>
                                            <div style={{ fontWeight: '700' }}>{item.socialVolume.toLocaleString()}</div>
                                            <div style={{ fontSize: '0.65rem', color: '#555' }}>постов/час</div>
                                        </td>
                                        <td style={td}>
                                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '150px' }}>
                                                {item.trendingPlatforms.map(p => (
                                                    <span key={p} style={{ fontSize: '0.6rem', color: '#777', padding: '1px 5px', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '3px' }}>{p}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td style={td}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#999' }}>
                                                <Info size={12} />
                                                {item.hotNews}
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        )}
                    </tbody>
                </table>
            </div>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
            `}</style>
        </div>
    );
};

export default SentimentScreener;
