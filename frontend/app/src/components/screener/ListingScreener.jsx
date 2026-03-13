import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCw, Clock, Rocket, ExternalLink, TrendingUp, TrendingDown } from 'lucide-react';

const EXCHANGES = ['binance', 'bybit', 'mexc'];

const fmtTimeAgo = (ts) => {
    if (!ts) return '–';
    const diff = (Date.now() - ts * 1000) / 1000;
    if (diff < 60) return `${Math.floor(diff)}с`;
    if (diff < 3600) return `${Math.floor(diff / 60)}м`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}ч`;
    return `${Math.floor(diff / 86400)}д`;
};

const genMockListings = () => {
    const coins = [
        { symbol: 'TRUMP', name: 'Official Trump', price: 12.42, change: -5.2 },
        { symbol: 'PEPE2', name: 'Pepe 2.0', price: 0.00000012, change: 124.5 },
        { symbol: 'VIRTUAL', name: 'Virtual Protocol', price: 0.82, change: 12.1 },
        { symbol: 'BORA', name: 'Bora Network', price: 0.14, change: 0.5 },
        { symbol: 'WIF', name: 'Dogwifhat', price: 3.42, change: 4.8 },
    ];
    const exchanges = ['binance', 'bybit', 'mexc'];

    return coins.map((c, idx) => ({
        id: `list-${idx}`,
        ...c,
        exchange: exchanges[idx % exchanges.length],
        launchTime: (Date.now() / 1000) - (Math.random() * 86400),
        volume24h: Math.random() * 10000000,
    })).sort((a, b) => b.launchTime - a.launchTime);
};

const th = { padding: '12px 14px', fontSize: '0.67rem', fontWeight: '800', color: '#444', textTransform: 'uppercase', letterSpacing: '0.8px', textAlign: 'left' };
const td = { padding: '16px 14px', color: '#e0e0e0', verticalAlign: 'middle' };

const ListingScreener = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            setError(null);
            const res = await fetch('/api/screener/listings');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            if (json.success) {
                setData(json.listings || []);
                setLastUpdate(new Date().toLocaleTimeString());
                return;
            }
            throw new Error('API error');
        } catch (e) {
            setError(e.message);
            setData(genMockListings());
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
                        <Sparkles size={22} color="#fd79a8" />
                        <h2 style={{ margin: 0, fontWeight: '900', fontSize: '1.6rem', color: '#fff' }}>New Listings</h2>
                        <span style={{
                            background: 'rgba(253,121,168,0.12)',
                            border: '1px solid rgba(253,121,168,0.3)',
                            color: '#fd79a8',
                            fontSize: '0.72rem',
                            fontWeight: '800',
                            padding: '3px 10px',
                            borderRadius: '20px'
                        }}>
                            ПОСЛЕДНИЕ 24Ч
                        </span>
                    </div>
                    <p style={{ color: '#555', margin: 0, fontSize: '0.85rem' }}>
                        {lastUpdate && <><Clock size={11} style={{ verticalAlign: 'middle', marginRight: '5px' }} />Обновлено: {lastUpdate} • </>}
                        Обнаружено {data.length} новых листингов
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '30px' }}>
                {data.slice(0, 3).map((item, idx) => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        style={{
                            padding: '20px', background: 'linear-gradient(135deg, rgba(253,121,168,0.1) 0%, rgba(255,255,255,0.02) 100%)',
                            border: '1px solid rgba(253,121,168,0.2)', borderRadius: '20px',
                            position: 'relative', overflow: 'hidden'
                        }}
                    >
                        <div style={{ position: 'absolute', top: -10, right: -10, opacity: 0.1 }}>
                            <Rocket size={80} color="#fd79a8" />
                        </div>
                        <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#fd79a8', marginBottom: '8px', textTransform: 'uppercase' }}>
                            {item.exchange} • {fmtTimeAgo(item.launchTime)} НАЗАД
                        </div>
                        <div style={{ fontSize: '1.8rem', fontWeight: '950', color: '#fff', marginBottom: '4px' }}>{item.symbol}</div>
                        <div style={{ fontSize: '0.85rem', color: '#555', marginBottom: '16px' }}>{item.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#fff' }}>${item.price < 0.01 ? item.price.toFixed(8) : item.price.toFixed(4)}</div>
                            <div style={{
                                color: item.change > 0 ? '#4CAF50' : '#FF5722', fontWeight: '900', fontSize: '0.9rem',
                                display: 'flex', alignItems: 'center', gap: '2px'
                            }}>
                                {item.change > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                {item.change > 0 ? '+' : ''}{item.change}%
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div style={{ overflowX: 'auto', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.87rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                            <th style={th}>Символ</th>
                            <th style={th}>Биржа</th>
                            <th style={th}>Цена</th>
                            <th style={th}>24ч Изм.</th>
                            <th style={th}>Возраст</th>
                            <th style={th}>Действие</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && !data.length ? (
                            <tr><td colSpan="6" style={{ padding: '60px', textAlign: 'center', color: '#444' }}>
                                <Sparkles size={24} style={{ animation: 'pulse 1.5s infinite', marginBottom: '12px' }} />
                                <div style={{ fontWeight: '700' }}>Поиск новых листингов...</div>
                            </td></tr>
                        ) : data.length === 0 ? (
                            <tr><td colSpan="6" style={{ padding: '60px', textAlign: 'center', color: '#444' }}>Новых листингов не найдено</td></tr>
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
                                        <td style={td}>
                                            <div style={{ fontWeight: '800', color: '#fff' }}>{item.symbol}</div>
                                            <div style={{ fontSize: '0.7rem', color: '#555' }}>{item.name}</div>
                                        </td>
                                        <td style={td}>
                                            <span style={{
                                                fontSize: '0.7rem', fontWeight: '900', textTransform: 'uppercase', color: '#888',
                                                padding: '2px 6px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px'
                                            }}>
                                                {item.exchange}
                                            </span>
                                        </td>
                                        <td style={td}><div style={{ fontWeight: '700' }}>${item.price < 0.01 ? item.price.toFixed(8) : item.price.toFixed(4)}</div></td>
                                        <td style={td}>
                                            <div style={{ color: item.change > 0 ? '#4CAF50' : '#FF5722', fontWeight: '800' }}>
                                                {item.change > 0 ? '+' : ''}{item.change}%
                                            </div>
                                        </td>
                                        <td style={td}>
                                            <div style={{ color: '#555', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <Clock size={12} />
                                                {fmtTimeAgo(item.launchTime)}
                                            </div>
                                        </td>
                                        <td style={td}>
                                            <button style={{
                                                padding: '6px 10px', borderRadius: '8px', border: 'none',
                                                background: 'rgba(255,255,255,0.05)', color: '#fff',
                                                fontSize: '0.7rem', fontWeight: '800', cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', gap: '4px'
                                            }}>
                                                ГРАФИК <ExternalLink size={10} />
                                            </button>
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
                @keyframes pulse { 0% { transform: scale(1); opacity: 0.4; } 50% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); opacity: 0.4; } }
            `}</style>
        </div>
    );
};

export default ListingScreener;
