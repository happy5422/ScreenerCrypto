import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    RefreshCcw, Search, TrendingUp, AlertCircle,
    ExternalLink, ArrowUpRight, ArrowDownLeft, Zap
} from 'lucide-react';

const ZeroFeeScreener = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [lastUpdated, setLastUpdated] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/screener/mexc-zero-fee');
            const result = await res.json();
            if (result.success) {
                setData(result.opportunities || []);
                setLastUpdated(new Date());
                setError(null);
            } else {
                setError(result.error || 'Failed to fetch data');
            }
        } catch (err) {
            setError('Connection error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    const filteredData = data.filter(item =>
        item.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ padding: '24px', color: '#fff' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Zap color="#4CAF50" size={24} />
                        MEXC Zero-Maker-Fee Screener
                    </h2>
                    <p style={{ color: '#666', margin: '4px 0 0', fontSize: '0.85rem' }}>
                        Токены с 0% maker-комиссией на MEXC и сравнение цен с Binance/Bybit
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ position: 'relative' }}>
                        <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#444' }} size={16} />
                        <input
                            type="text"
                            placeholder="Поиск монеты..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.07)',
                                borderRadius: '10px',
                                padding: '10px 12px 10px 36px',
                                color: '#fff',
                                fontSize: '0.85rem',
                                width: '200px'
                            }}
                        />
                    </div>
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '10px',
                            padding: '8px 16px',
                            color: '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontWeight: '700',
                            fontSize: '0.85rem'
                        }}
                    >
                        <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
                        {loading ? 'Обновление...' : 'Обновить'}
                    </button>
                </div>
            </div>

            {/* Table */}
            <div style={{
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.05)',
                overflow: 'hidden'
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
                            <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: 800, color: '#444', textTransform: 'uppercase' }}>Монета</th>
                            <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: 800, color: '#444', textTransform: 'uppercase' }}>MEXC (0% Maker)</th>
                            <th style={{ padding: '12px', fontSize: '0.75rem', fontWeight: 800, color: '#444', textTransform: 'uppercase' }}>Binance</th>
                            <th style={{ padding: '12px', fontSize: '0.75rem', fontWeight: 800, color: '#444', textTransform: 'uppercase' }}>Bybit</th>
                            <th style={{ padding: '12px', fontSize: '0.75rem', fontWeight: 800, color: '#444', textTransform: 'uppercase' }}>Gate.io</th>
                            <th style={{ padding: '12px', fontSize: '0.75rem', fontWeight: 800, color: '#444', textTransform: 'uppercase' }}>Astradex</th>
                            <th style={{ padding: '12px', fontSize: '0.75rem', fontWeight: 800, color: '#444', textTransform: 'uppercase' }}>HLiquid</th>
                            <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: 800, color: '#444', textTransform: 'uppercase' }}>Max Spread</th>
                            <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: 800, color: '#444', textTransform: 'uppercase' }}>Vol 30m (MEXC)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <AnimatePresence mode="popLayout">
                            {filteredData.map((item, idx) => (
                                <motion.tr
                                    key={item.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ delay: idx * 0.02 }}
                                    style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                                    whileHover={{ background: 'rgba(255,255,255,0.02)' }}
                                >
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{item.symbol.split(':')[0]}</div>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ fontWeight: 700, color: '#fff' }}>${item.priceMexc.toLocaleString()}</div>
                                        <div style={{ fontSize: '0.65rem', color: '#4CAF50', fontWeight: 900 }}>(${formatVol(item.volMexc30m)})</div>
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <ExchangeCell data={item.comparisons?.binance} />
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <ExchangeCell data={item.comparisons?.bybit} />
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <ExchangeCell data={item.comparisons?.gate} />
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <ExchangeCell data={item.comparisons?.astradex} />
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <ExchangeCell data={item.comparisons?.hyperliquid} />
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{
                                            fontWeight: 900,
                                            fontSize: '1rem',
                                            color: Math.abs(item.maxSpread) > 0.5 ? '#FFD700' : '#fff'
                                        }}>
                                            {item.maxSpread > 0 ? '+' : ''}{item.maxSpread}%
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ color: '#666', fontSize: '0.85rem' }}>${formatVol(item.volMexc30m)}</div>
                                    </td>
                                </motion.tr>
                            ))}
                        </AnimatePresence>
                    </tbody>
                </table>

                {filteredData.length === 0 && !loading && (
                    <div style={{ padding: '60px', textAlign: 'center', color: '#444' }}>
                        <AlertCircle size={40} style={{ marginBottom: '16px', opacity: 0.2 }} />
                        <div>Токены не найдены</div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
            `}</style>
        </div>
    );
};

const formatVol = (v) => {
    if (v >= 1000000) return (v / 1000000).toFixed(2) + 'M';
    if (v >= 1000) return (v / 1000).toFixed(1) + 'K';
    return v.toFixed(0);
};

const ExchangeCell = ({ data }) => {
    if (!data) return <div style={{ color: '#333' }}>-</div>;
    return (
        <div>
            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>${data.price.toLocaleString()}</div>
            <div style={{ fontSize: '0.65rem', color: '#666' }}>({formatVol(data.vol30m)})</div>
            <SpreadBadge value={data.spread} />
        </div>
    );
};

const SpreadBadge = ({ value }) => {
    const isPositive = value > 0;
    return (
        <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '2px',
            fontSize: '0.7rem',
            fontWeight: 800,
            color: isPositive ? '#4CAF50' : '#FF5252',
            padding: '2px 6px',
            borderRadius: '4px',
            background: isPositive ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 82, 82, 0.1)',
            marginTop: '4px'
        }}>
            {isPositive ? <ArrowUpRight size={10} /> : <ArrowDownLeft size={10} />}
            {isPositive ? '+' : ''}{value}%
        </div>
    );
};

export default ZeroFeeScreener;
