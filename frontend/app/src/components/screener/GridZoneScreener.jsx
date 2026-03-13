import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, RefreshCw, TrendingUp, TrendingDown, Clock } from 'lucide-react';

const EXCHANGES = ['binance', 'bybit', 'mexc'];

const fmtPrice = (p) => {
    if (!p) return '–';
    if (p >= 1000) return p.toLocaleString('en-US', { maximumFractionDigits: 1 });
    if (p >= 1) return p.toFixed(4);
    return p.toFixed(6);
};

const fmtVol = (v) => {
    if (!v) return '–';
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
    return `$${v.toFixed(0)}`;
};

const ChannelBar = ({ posInChannel }) => {
    const clampedPos = Math.max(0, Math.min(100, posInChannel));
    const color = clampedPos < 25 ? '#4CAF50' : clampedPos > 75 ? '#FF5722' : '#888';
    return (
        <div style={{ position: 'relative', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', width: '80px' }}>
            <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0,
                width: `${clampedPos}%`, borderRadius: '3px',
                background: `linear-gradient(90deg, #4CAF50, ${color})`
            }} />
            <div style={{
                position: 'absolute', left: `${clampedPos}%`, top: '-3px',
                width: '12px', height: '12px', borderRadius: '50%',
                background: color, border: '2px solid #0a0a0a',
                transform: 'translateX(-50%)'
            }} />
        </div>
    );
};

// Mock data generator
const genMockGridData = () => {
    const symbols = ['ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'LINK/USDT', 'ADA/USDT',
        'AVAX/USDT', 'CRV/USDT', 'ATOM/USDT', 'NEAR/USDT', 'FTM/USDT'];
    const exchanges = ['binance', 'bybit', 'mexc'];
    return symbols.map(sym => {
        const base = Math.random() * 5000 + 0.5;
        const width = (Math.random() * 8 + 2);
        const low = base * (1 - width / 200);
        const high = base * (1 + width / 200);
        const price = low + (high - low) * Math.random();
        const posInChannel = (price - low) / (high - low) * 100;
        return {
            symbol: sym,
            exchange: exchanges[Math.floor(Math.random() * exchanges.length)],
            price, channelLow: low, channelHigh: high,
            channelWidthPct: width,
            posInChannel: Math.round(posInChannel),
            squeezeRatio: +(Math.random() * 0.5 + 0.1).toFixed(2),
            volume24h: Math.random() * 3_000_000 + 100_000,
            action: posInChannel < 30 ? 'BUY' : posInChannel > 70 ? 'SELL' : 'WAIT',
        };
    });
};

const ACTION_STYLE = {
    BUY: { color: '#4CAF50', bg: 'rgba(76,175,80,0.12)', border: 'rgba(76,175,80,0.3)', label: '📈 Покупать' },
    SELL: { color: '#FF5722', bg: 'rgba(255,87,34,0.12)', border: 'rgba(255,87,34,0.3)', label: '📉 Продавать' },
    WAIT: { color: '#888', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.1)', label: '⏳ Ждать' },
};

const th = { padding: '11px 14px', fontSize: '0.67rem', fontWeight: '800', color: '#444', textTransform: 'uppercase', letterSpacing: '0.8px', textAlign: 'left', whiteSpace: 'nowrap' };
const td = { padding: '14px 14px', color: '#e0e0e0', verticalAlign: 'middle' };

const GridZoneScreener = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [selectedExchanges, setSelectedExchanges] = useState(EXCHANGES);
    const [actionFilter, setActionFilter] = useState('all');
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            setError(null);
            const res = await fetch('/api/screener/grid-zones');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            if (json.success) {
                setData(json.zones || []);
                setLastUpdate(new Date().toLocaleTimeString());
                return;
            }
            throw new Error('API error');
        } catch (e) {
            setError(e.message);
            setData(genMockGridData());
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30_000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const filtered = data
        .filter(d => selectedExchanges.includes(d.exchange))
        .filter(d => actionFilter === 'all' || d.action === actionFilter)
        .sort((a, b) => a.squeezeRatio - b.squeezeRatio);

    return (
        <div style={{ padding: '30px', fontFamily: "'Inter', sans-serif" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                        <LayoutGrid size={22} color="#00cec9" />
                        <h2 style={{ margin: 0, fontWeight: '900', fontSize: '1.6rem', color: '#fff' }}>Grid Zones</h2>
                        <span style={{ background: 'rgba(0,206,201,0.12)', border: '1px solid rgba(0,206,201,0.3)', color: '#00cec9', fontSize: '0.72rem', fontWeight: '800', padding: '3px 10px', borderRadius: '20px' }}>
                            30М — 4ЧАС
                        </span>
                    </div>
                    <p style={{ color: '#555', margin: 0, fontSize: '0.85rem' }}>
                        {lastUpdate && <><Clock size={11} style={{ verticalAlign: 'middle', marginRight: '5px' }} />Обновлено: {lastUpdate} • </>}
                        {filtered.length} зон для грида
                    </p>
                </div>
                <button onClick={fetchData} disabled={loading} style={{ padding: '8px 14px', borderRadius: '10px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#aaa', fontWeight: '700', fontSize: '0.78rem' }}>
                    <RefreshCw size={13} style={{ verticalAlign: 'middle', marginRight: '5px', animation: loading ? 'spin 1s linear infinite' : 'none' }} />Refresh
                </button>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', padding: '14px 18px', background: 'rgba(255,255,255,0.02)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap', alignItems: 'center' }}>
                {EXCHANGES.map(ex => (
                    <button key={ex} onClick={() => setSelectedExchanges(prev => prev.includes(ex) ? prev.filter(e => e !== ex) : [...prev, ex])} style={{ padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', border: `1px solid ${selectedExchanges.includes(ex) ? 'rgba(0,206,201,0.4)' : 'rgba(255,255,255,0.06)'}`, background: selectedExchanges.includes(ex) ? 'rgba(0,206,201,0.1)' : 'transparent', color: selectedExchanges.includes(ex) ? '#00cec9' : '#555' }}>{ex}</button>
                ))}
                <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.06)' }} />
                {[['all', 'Все'], ['BUY', '📈 Покупать'], ['SELL', '📉 Продавать'], ['WAIT', '⏳ Ждать']].map(([v, l]) => (
                    <button key={v} onClick={() => setActionFilter(v)} style={{ padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '800', border: `1px solid ${actionFilter === v ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)'}`, background: actionFilter === v ? 'rgba(255,255,255,0.08)' : 'transparent', color: actionFilter === v ? '#fff' : '#555' }}>{l}</button>
                ))}
            </div>

            <div style={{ overflowX: 'auto', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.87rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                            <th style={th}>Пара</th>
                            <th style={th}>Цена</th>
                            <th style={th}>Канал</th>
                            <th style={th}>Ширина</th>
                            <th style={th}>Позиция</th>
                            <th style={th}>ATR Squeeze</th>
                            <th style={th}>Объём 24ч</th>
                            <th style={th}>Действие</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && !data.length ? (
                            <tr><td colSpan="8" style={{ padding: '60px', textAlign: 'center', color: '#444' }}>
                                <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
                                <div style={{ fontSize: '0.85rem', fontWeight: '700' }}>Анализ каналов...</div>
                            </td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan="8" style={{ padding: '60px', textAlign: 'center', color: '#444' }}>Нет зон по фильтрам</td></tr>
                        ) : (
                            <AnimatePresence>
                                {filtered.map((item, idx) => {
                                    const actStyle = ACTION_STYLE[item.action] || ACTION_STYLE.WAIT;
                                    return (
                                        <motion.tr key={`${item.symbol}-${item.exchange}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={td}>
                                                <div style={{ fontWeight: '800', color: '#fff' }}>{item.symbol.split('/')[0]}</div>
                                                <div style={{ fontSize: '0.7rem', color: '#555', textTransform: 'uppercase' }}>{item.exchange}</div>
                                            </td>
                                            <td style={td}><div style={{ fontWeight: '700' }}>${fmtPrice(item.price)}</div></td>
                                            <td style={td}>
                                                <div style={{ fontSize: '0.78rem', color: '#4CAF50' }}>${fmtPrice(item.channelHigh)}</div>
                                                <div style={{ fontSize: '0.78rem', color: '#FF5722' }}>${fmtPrice(item.channelLow)}</div>
                                            </td>
                                            <td style={td}><div style={{ color: '#00cec9', fontWeight: '700' }}>{item.channelWidthPct?.toFixed(1)}%</div></td>
                                            <td style={td}>
                                                <div style={{ marginBottom: '4px' }}><ChannelBar posInChannel={item.posInChannel} /></div>
                                                <div style={{ fontSize: '0.72rem', color: '#555' }}>{item.posInChannel?.toFixed(0)}% в канале</div>
                                            </td>
                                            <td style={td}>
                                                <div style={{ color: item.squeezeRatio < 0.4 ? '#FFD700' : '#888', fontWeight: '700' }}>
                                                    {item.squeezeRatio < 0.3 && '🔥 '}{item.squeezeRatio?.toFixed(2)}
                                                </div>
                                            </td>
                                            <td style={td}><div style={{ color: '#666', fontSize: '0.82rem' }}>{fmtVol(item.volume24h)}</div></td>
                                            <td style={td}>
                                                <div style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '0.76rem', fontWeight: '800', background: actStyle.bg, border: `1px solid ${actStyle.border}`, color: actStyle.color, display: 'inline-block', whiteSpace: 'nowrap' }}>
                                                    {actStyle.label}
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
            {error && <div style={{ marginTop: '10px', color: '#FF9800', fontSize: '0.78rem', textAlign: 'center' }}>⚠️ API недоступен — демо-данные</div>}
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </div>
    );
};

export default GridZoneScreener;
