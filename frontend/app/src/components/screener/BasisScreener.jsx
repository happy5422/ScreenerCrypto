import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, RefreshCw, Clock, AlertCircle } from 'lucide-react';

const fmtPrice = (p) => {
    if (!p) return '–';
    if (p >= 1000) return p.toLocaleString('en-US', { maximumFractionDigits: 1 });
    if (p >= 1) return p.toFixed(4);
    return p.toFixed(6);
};

const genMockBasis = () => {
    const pairs = ['BTC', 'ETH', 'SOL', 'BNB', 'AVAX', 'LINK', 'DOGE', 'ADA', 'INJ', 'SUI'];
    return pairs.map(base => {
        const perpPrice = Math.random() * 80000 + 100;
        const basisPct = (Math.random() - 0.4) * 4;
        const quarterlyPrice = perpPrice * (1 + basisPct / 100);
        const annualBasisPct = basisPct * (365 / 90);
        return {
            base,
            perpSymbol: `${base}/USDT:USDT`,
            quarterlySymbol: `${base}/USDT:USDT-260627`,
            perpPrice,
            quarterlyPrice,
            basisPct: +basisPct.toFixed(4),
            annualBasisPct: +annualBasisPct.toFixed(2),
            action: basisPct > 0 ? 'LONG_PERP_SHORT_Q' : 'SHORT_PERP_LONG_Q',
            exchange: 'binance',
        };
    }).sort((a, b) => Math.abs(b.basisPct) - Math.abs(a.basisPct));
};

const th = { padding: '11px 16px', fontSize: '0.67rem', fontWeight: '800', color: '#444', textTransform: 'uppercase', letterSpacing: '0.8px', textAlign: 'left', whiteSpace: 'nowrap' };
const td = { padding: '15px 16px', color: '#e0e0e0', verticalAlign: 'middle' };

const BasisScreener = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [error, setError] = useState(null);
    const [minBasis, setMinBasis] = useState(0.1);

    const fetchData = useCallback(async () => {
        try {
            setError(null);
            const res = await fetch('/api/screener/basis');
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
            setData(genMockBasis());
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 20_000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const filtered = data.filter(d => Math.abs(d.basisPct) >= minBasis);

    return (
        <div style={{ padding: '30px', fontFamily: "'Inter', sans-serif" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                        <BarChart3 size={22} color="#74b9ff" />
                        <h2 style={{ margin: 0, fontWeight: '900', fontSize: '1.6rem', color: '#fff' }}>Basis / Premium</h2>
                        <span style={{ background: 'rgba(116,185,255,0.12)', border: '1px solid rgba(116,185,255,0.3)', color: '#74b9ff', fontSize: '0.72rem', fontWeight: '800', padding: '3px 10px', borderRadius: '20px' }}>
                            PERP VS КВАРТАЛ
                        </span>
                    </div>
                    <p style={{ color: '#555', margin: 0, fontSize: '0.85rem' }}>
                        {lastUpdate && <><Clock size={11} style={{ verticalAlign: 'middle', marginRight: '5px' }} />Обновлено: {lastUpdate} • </>}
                        {filtered.length} пар с базисом {'>'} {minBasis}%
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#555', fontSize: '0.76rem', fontWeight: '700' }}>Мин. basis:</span>
                        <input type="number" min="0" max="10" step="0.1" value={minBasis} onChange={e => setMinBasis(parseFloat(e.target.value) || 0)} style={{ width: '60px', padding: '6px 8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontWeight: '700', fontSize: '0.8rem' }} />
                        <span style={{ color: '#555', fontSize: '0.76rem' }}>%</span>
                    </div>
                    <button onClick={fetchData} disabled={loading} style={{ padding: '8px 14px', borderRadius: '10px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#aaa', fontWeight: '700', fontSize: '0.78rem' }}>
                        <RefreshCw size={13} style={{ verticalAlign: 'middle', marginRight: '5px', animation: loading ? 'spin 1s linear infinite' : 'none' }} />Refresh
                    </button>
                </div>
            </div>

            {/* Explanation card */}
            <div style={{ marginBottom: '20px', padding: '16px 20px', background: 'rgba(116,185,255,0.05)', border: '1px solid rgba(116,185,255,0.12)', borderRadius: '14px' }}>
                <div style={{ fontSize: '0.8rem', color: '#74b9ff', fontWeight: '700', marginBottom: '6px' }}>
                    <AlertCircle size={13} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                    Как работает Basis торговля?
                </div>
                <div style={{ fontSize: '0.78rem', color: '#555', lineHeight: '1.6' }}>
                    <strong style={{ color: '#888' }}>Basis</strong> — разница в цене между бессрочным (PERP) и квартальным (Quarterly) фьючерсом.
                    Если квартальный торгуется дороже PERP → <strong style={{ color: '#4CAF50' }}>лонг PERP + шорт квартала</strong> = зарабатываешь на схлопывании базиса к экспирации.
                </div>
            </div>

            <div style={{ overflowX: 'auto', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.87rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                            <th style={th}>Монета</th>
                            <th style={th}>PERP цена</th>
                            <th style={th}>Квартал цена</th>
                            <th style={th}>Basis %</th>
                            <th style={th}>Annual %</th>
                            <th style={th}>Стратегия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && !data.length ? (
                            <tr><td colSpan="6" style={{ padding: '60px', textAlign: 'center', color: '#444' }}>
                                <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
                                <div style={{ fontSize: '0.85rem', fontWeight: '700' }}>Загружаю данные Binance...</div>
                            </td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan="6" style={{ padding: '60px', textAlign: 'center', color: '#444' }}>Нет пар с базисом {'>'} {minBasis}%</td></tr>
                        ) : (
                            <AnimatePresence>
                                {filtered.map((item, idx) => {
                                    const basisColor = Math.abs(item.basisPct) > 1 ? '#FFD700' : Math.abs(item.basisPct) > 0.3 ? '#FF9800' : '#74b9ff';
                                    const isPositive = item.basisPct > 0;
                                    return (
                                        <motion.tr key={item.base} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.025 }} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={td}>
                                                <div style={{ fontWeight: '900', color: '#fff', fontSize: '1.05rem' }}>{item.base}</div>
                                                <div style={{ fontSize: '0.7rem', color: '#555', textTransform: 'uppercase' }}>{item.exchange}</div>
                                            </td>
                                            <td style={td}><div style={{ fontWeight: '700' }}>${fmtPrice(item.perpPrice)}</div></td>
                                            <td style={td}><div style={{ fontWeight: '700' }}>${fmtPrice(item.quarterlyPrice)}</div></td>
                                            <td style={td}>
                                                <div style={{ fontWeight: '900', fontSize: '1rem', color: basisColor }}>
                                                    {isPositive ? '+' : ''}{item.basisPct?.toFixed(4)}%
                                                </div>
                                                {/* Visual bar */}
                                                <div style={{ height: '3px', width: `${Math.min(Math.abs(item.basisPct) * 30, 100)}px`, background: basisColor, borderRadius: '2px', marginTop: '4px' }} />
                                            </td>
                                            <td style={td}>
                                                <div style={{ fontWeight: '800', color: item.annualBasisPct > 10 ? '#4CAF50' : item.annualBasisPct > 3 ? '#FF9800' : '#888' }}>
                                                    {item.annualBasisPct > 0 ? '+' : ''}{item.annualBasisPct?.toFixed(1)}% / год
                                                </div>
                                            </td>
                                            <td style={td}>
                                                {item.action === 'LONG_PERP_SHORT_Q' ? (
                                                    <div style={{ fontSize: '0.76rem', fontWeight: '800', color: '#4CAF50', background: 'rgba(76,175,80,0.1)', border: '1px solid rgba(76,175,80,0.25)', padding: '4px 10px', borderRadius: '8px', display: 'inline-block', whiteSpace: 'nowrap' }}>
                                                        📈 Лонг PERP + Шорт Q
                                                    </div>
                                                ) : (
                                                    <div style={{ fontSize: '0.76rem', fontWeight: '800', color: '#FF5722', background: 'rgba(255,87,34,0.1)', border: '1px solid rgba(255,87,34,0.25)', padding: '4px 10px', borderRadius: '8px', display: 'inline-block', whiteSpace: 'nowrap' }}>
                                                        📉 Шорт PERP + Лонг Q
                                                    </div>
                                                )}
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

export default BasisScreener;
