import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, RefreshCw, Clock, TrendingUp, TrendingDown } from 'lucide-react';

const EXCHANGES = ['binance', 'bybit', 'mexc'];

const fmtPrice = (p) => {
    if (!p) return '–';
    if (p >= 1000) return p.toLocaleString('en-US', { maximumFractionDigits: 1 });
    if (p >= 1) return p.toFixed(4);
    return p.toFixed(6);
};

const fmtVol = (v) => {
    if (!v) return '–';
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
    return `$${v.toFixed(0)}`;
};

const genMockAlpha = () => {
    const symbols = ['BOME/USDT', 'WEN/USDT', 'MYRO/USDT', 'SLERF/USDT', 'POPCAT/USDT',
        'NEIRO/USDT', 'MOODENG/USDT', 'PNUT/USDT', 'ACT/USDT', 'GIGA/USDT',
        'FWOG/USDT', 'MICHI/USDT', 'TURBO/USDT', 'GOAT/USDT', 'COQ/USDT'];
    const exchanges = ['binance', 'bybit', 'mexc'];
    const sigs = ['LONG', 'SHORT', 'NEUTRAL'];
    return symbols.map(sym => ({
        symbol: sym,
        exchange: exchanges[Math.floor(Math.random() * exchanges.length)],
        price: Math.random() * 2 + 0.00001,
        volume24h: Math.random() * 4_000_000 + 50_000,
        fundingRate: +(((Math.random() - 0.4) * 0.003)).toFixed(5),
        fundingDirection: Math.random() > 0.5 ? 'HIGH' : 'LOW',
        signal: sigs[Math.floor(Math.random() * sigs.length)],
        competition: Math.random() > 0.5 ? 'LOW' : 'MEDIUM',
    })).sort((a, b) => Math.abs(b.fundingRate) - Math.abs(a.fundingRate));
};

const SIG_STYLE = {
    LONG: { color: '#4CAF50', bg: 'rgba(76,175,80,0.1)', border: 'rgba(76,175,80,0.25)', label: '📈 Лонг', Icon: TrendingUp },
    SHORT: { color: '#FF5722', bg: 'rgba(255,87,34,0.1)', border: 'rgba(255,87,34,0.25)', label: '📉 Шорт', Icon: TrendingDown },
    NEUTRAL: { color: '#888', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)', label: '⚪ Нейтрал', Icon: null },
};

const th = { padding: '11px 14px', fontSize: '0.67rem', fontWeight: '800', color: '#444', textTransform: 'uppercase', letterSpacing: '0.8px', textAlign: 'left', whiteSpace: 'nowrap' };
const td = { padding: '14px 14px', color: '#e0e0e0', verticalAlign: 'middle' };

const AlphaScreener = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [selectedExchanges, setSelectedExchanges] = useState(EXCHANGES);
    const [signalFilter, setSignalFilter] = useState('all');
    const [maxVolume, setMaxVolume] = useState(5_000_000);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            setError(null);
            const res = await fetch(`/api/screener/alpha?max_volume=${maxVolume}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            if (json.success) {
                setData(json.opportunities || []);
                setLastUpdate(new Date().toLocaleTimeString());
                return;
            }
            throw new Error('API error');
        } catch (e) {
            setError(e.message);
            setData(genMockAlpha());
        } finally {
            setLoading(false);
        }
    }, [maxVolume]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30_000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const filtered = data
        .filter(d => selectedExchanges.includes(d.exchange))
        .filter(d => signalFilter === 'all' || d.signal === signalFilter);

    return (
        <div style={{ padding: '30px', fontFamily: "'Inter', sans-serif" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                        <Search size={22} color="#e17055" />
                        <h2 style={{ margin: 0, fontWeight: '900', fontSize: '1.6rem', color: '#fff' }}>Low-Liq Alpha</h2>
                        <span style={{ background: 'rgba(225,112,85,0.12)', border: '1px solid rgba(225,112,85,0.3)', color: '#e17055', fontSize: '0.72rem', fontWeight: '800', padding: '3px 10px', borderRadius: '20px' }}>
                            МАЛО КОНКУРЕНТОВ
                        </span>
                    </div>
                    <p style={{ color: '#555', margin: 0, fontSize: '0.85rem' }}>
                        {lastUpdate && <><Clock size={11} style={{ verticalAlign: 'middle', marginRight: '5px' }} />Обновлено: {lastUpdate} • </>}
                        {filtered.length} пар с аномальным фандингом
                    </p>
                </div>
                <button onClick={fetchData} disabled={loading} style={{ padding: '8px 14px', borderRadius: '10px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#aaa', fontWeight: '700', fontSize: '0.78rem' }}>
                    <RefreshCw size={13} style={{ verticalAlign: 'middle', marginRight: '5px', animation: loading ? 'spin 1s linear infinite' : 'none' }} />Refresh
                </button>
            </div>

            {/* Insight box */}
            <div style={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                    { label: 'Принцип', value: '‹ $5M объём = меньше ботов', color: '#e17055' },
                    { label: 'Сигнал', value: 'Аномальный funding → разворот', color: '#FFD700' },
                    { label: 'Цель', value: '1–2% за сделку, стабильно', color: '#4CAF50' },
                ].map(s => (
                    <div key={s.label} style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                        <div style={{ fontSize: '0.68rem', color: '#444', fontWeight: '800', textTransform: 'uppercase', marginBottom: '5px' }}>{s.label}</div>
                        <div style={{ fontSize: '0.82rem', color: s.color, fontWeight: '700' }}>{s.value}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', padding: '14px 18px', background: 'rgba(255,255,255,0.02)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap', alignItems: 'center' }}>
                {EXCHANGES.map(ex => (
                    <button key={ex} onClick={() => setSelectedExchanges(prev => prev.includes(ex) ? prev.filter(e => e !== ex) : [...prev, ex])} style={{ padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', border: `1px solid ${selectedExchanges.includes(ex) ? 'rgba(225,112,85,0.4)' : 'rgba(255,255,255,0.06)'}`, background: selectedExchanges.includes(ex) ? 'rgba(225,112,85,0.1)' : 'transparent', color: selectedExchanges.includes(ex) ? '#e17055' : '#555' }}>{ex}</button>
                ))}
                <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.06)' }} />
                {[['all', 'Все'], ['LONG', '📈 Лонг'], ['SHORT', '📉 Шорт']].map(([v, l]) => (
                    <button key={v} onClick={() => setSignalFilter(v)} style={{ padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '800', border: `1px solid ${signalFilter === v ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)'}`, background: signalFilter === v ? 'rgba(255,255,255,0.08)' : 'transparent', color: signalFilter === v ? '#fff' : '#555' }}>{l}</button>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                    <span style={{ color: '#555', fontSize: '0.75rem', fontWeight: '700' }}>Макс. объём:</span>
                    <select value={maxVolume} onChange={e => setMaxVolume(Number(e.target.value))} style={{ padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#bbb', fontWeight: '700', fontSize: '0.78rem' }}>
                        <option value={500_000}>$500K</option>
                        <option value={1_000_000}>$1M</option>
                        <option value={5_000_000}>$5M</option>
                        <option value={10_000_000}>$10M</option>
                    </select>
                </div>
            </div>

            <div style={{ overflowX: 'auto', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.87rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                            <th style={th}>Пара</th>
                            <th style={th}>Цена</th>
                            <th style={th}>Funding %</th>
                            <th style={th}>Объём 24ч</th>
                            <th style={th}>Конкуренция</th>
                            <th style={th}>Сигнал</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && !data.length ? (
                            <tr><td colSpan="6" style={{ padding: '60px', textAlign: 'center', color: '#444' }}>
                                <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
                                <div style={{ fontSize: '0.85rem', fontWeight: '700' }}>Поиск альфы...</div>
                            </td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan="6" style={{ padding: '60px', textAlign: 'center', color: '#444' }}>Нет данных по фильтрам</td></tr>
                        ) : (
                            <AnimatePresence>
                                {filtered.map((item, idx) => {
                                    const sigStyle = SIG_STYLE[item.signal] || SIG_STYLE.NEUTRAL;
                                    const fundingColor = Math.abs(item.fundingRate) > 0.1 ? '#FFD700' : Math.abs(item.fundingRate) > 0.05 ? '#FF9800' : '#e17055';
                                    return (
                                        <motion.tr key={`${item.symbol}-${item.exchange}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={td}>
                                                <div style={{ fontWeight: '800', color: '#fff' }}>{item.symbol.split('/')[0]}</div>
                                                <div style={{ fontSize: '0.7rem', color: '#555', textTransform: 'uppercase' }}>{item.exchange}</div>
                                            </td>
                                            <td style={td}><div style={{ fontWeight: '700' }}>${fmtPrice(item.price)}</div></td>
                                            <td style={td}>
                                                <div style={{ fontWeight: '900', color: fundingColor, fontSize: '0.95rem' }}>
                                                    {item.fundingRate > 0 ? '+' : ''}{item.fundingRate?.toFixed(5)}%
                                                    {Math.abs(item.fundingRate) > 0.1 && ' 🔥'}
                                                </div>
                                                <div style={{ fontSize: '0.7rem', color: '#444', marginTop: '2px' }}>
                                                    {item.fundingDirection === 'HIGH' ? 'Лонги переплачивают' : 'Шорты переплачивают'}
                                                </div>
                                            </td>
                                            <td style={td}><div style={{ color: '#666', fontSize: '0.82rem' }}>{fmtVol(item.volume24h)}</div></td>
                                            <td style={td}>
                                                <span style={{
                                                    padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: '800',
                                                    background: item.competition === 'LOW' ? 'rgba(76,175,80,0.1)' : 'rgba(255,152,0,0.1)',
                                                    border: item.competition === 'LOW' ? '1px solid rgba(76,175,80,0.25)' : '1px solid rgba(255,152,0,0.25)',
                                                    color: item.competition === 'LOW' ? '#4CAF50' : '#FF9800',
                                                }}>
                                                    {item.competition === 'LOW' ? '🟢 Низкая' : '🟡 Средняя'}
                                                </span>
                                            </td>
                                            <td style={td}>
                                                <div style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '800', background: sigStyle.bg, border: `1px solid ${sigStyle.border}`, color: sigStyle.color, display: 'inline-block', whiteSpace: 'nowrap' }}>
                                                    {sigStyle.label}
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

export default AlphaScreener;
