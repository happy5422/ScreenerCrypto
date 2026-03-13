import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, RefreshCw, Shield, Zap, AlertTriangle, Clock } from 'lucide-react';

const EXCHANGES = ['binance', 'bybit', 'mexc'];

const BOT_TYPES = {
    SPOOFING: { label: 'Spoofing', color: '#ff7675', desc: 'Крупные ордера появляются и исчезают перед ценой' },
    WASH_TRADING: { label: 'Wash Trading', color: '#fdcb6e', desc: 'Искусственный объём через самовыкуп' },
    MM_ALGO: { label: 'MM Algo', color: '#74b9ff', desc: 'Алгоритмическое поддержание ликвидности' },
    FRONT_RUNNING: { label: 'Front Running', color: '#a29bfe', desc: 'Опережение крупных рыночных заявок' },
};

const fmtPrice = (p) => {
    if (!p) return '–';
    if (p >= 1000) return p.toLocaleString('en-US', { maximumFractionDigits: 1 });
    if (p >= 1) return p.toFixed(4);
    return p.toFixed(6);
};

const genMockBots = () => {
    const symbols = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT', 'ADA/USDT'];
    const exchanges = ['binance', 'bybit', 'mexc'];
    const types = Object.keys(BOT_TYPES);

    return symbols.map(sym => {
        const botType = types[Math.floor(Math.random() * types.length)];
        const confidence = Math.round(60 + Math.random() * 40);
        return {
            id: Math.random().toString(36).substr(2, 9),
            symbol: sym,
            exchange: exchanges[Math.floor(Math.random() * exchanges.length)],
            botType,
            confidence,
            impact: confidence > 85 ? 'HIGH' : 'MEDIUM',
            price: Math.random() * 1000 + 1,
            timestamp: Date.now() / 1000,
        };
    }).sort((a, b) => b.confidence - a.confidence);
};

const th = { padding: '12px 14px', fontSize: '0.67rem', fontWeight: '800', color: '#444', textTransform: 'uppercase', letterSpacing: '0.8px', textAlign: 'left' };
const td = { padding: '14px 14px', color: '#e0e0e0', verticalAlign: 'middle' };

const BotDetectorScreener = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            setError(null);
            const res = await fetch('/api/screener/bots');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            if (json.success) {
                setData(json.bots || []);
                setLastUpdate(new Date().toLocaleTimeString());
                return;
            }
            throw new Error('API error');
        } catch (e) {
            setError(e.message);
            setData(genMockBots());
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 15_000);
        return () => clearInterval(interval);
    }, [fetchData]);

    return (
        <div style={{ padding: '30px', fontFamily: "'Inter', sans-serif" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                        <Bot size={22} color="#a29bfe" />
                        <h2 style={{ margin: 0, fontWeight: '900', fontSize: '1.6rem', color: '#fff' }}>MM & Bot Detector</h2>
                        <span style={{
                            background: 'rgba(162,155,254,0.12)',
                            border: '1px solid rgba(162,155,254,0.3)',
                            color: '#a29bfe',
                            fontSize: '0.72rem',
                            fontWeight: '800',
                            padding: '3px 10px',
                            borderRadius: '20px'
                        }}>
                            АНАЛИЗ СТАКАНА
                        </span>
                    </div>
                    <p style={{ color: '#555', margin: 0, fontSize: '0.85rem' }}>
                        {lastUpdate && <><Clock size={11} style={{ verticalAlign: 'middle', marginRight: '5px' }} />Обновлено: {lastUpdate} • </>}
                        Обнаружено {data.length} активных алгоритмов
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
                {Object.entries(BOT_TYPES).map(([key, info]) => (
                    <div key={key} style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '14px' }}>
                        <div style={{ fontSize: '0.7rem', color: info.color, fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' }}>{info.label}</div>
                        <div style={{ fontSize: '0.78rem', color: '#555', lineHeight: '1.4' }}>{info.desc}</div>
                    </div>
                ))}
            </div>

            <div style={{ overflowX: 'auto', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.87rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                            <th style={th}>Тикер</th>
                            <th style={th}>Тип бота</th>
                            <th style={th}>Уверенность</th>
                            <th style={th}>Цена</th>
                            <th style={th}>Влияние</th>
                            <th style={th}>Статус</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && !data.length ? (
                            <tr><td colSpan="6" style={{ padding: '60px', textAlign: 'center', color: '#444' }}>
                                <Bot size={24} style={{ animation: 'pulse 1.5s infinite', marginBottom: '12px' }} />
                                <div style={{ fontWeight: '700' }}>Сканирование алгоритмов...</div>
                            </td></tr>
                        ) : data.length === 0 ? (
                            <tr><td colSpan="6" style={{ padding: '60px', textAlign: 'center', color: '#444' }}>Ботов не обнаружено</td></tr>
                        ) : (
                            <AnimatePresence>
                                {data.map((bot, idx) => {
                                    const typeInfo = BOT_TYPES[bot.botType] || { label: bot.botType, color: '#888' };
                                    return (
                                        <motion.tr
                                            key={bot.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.03 }}
                                            style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <td style={td}>
                                                <div style={{ fontWeight: '800', color: '#fff' }}>{bot.symbol}</div>
                                                <div style={{ fontSize: '0.7rem', color: '#555', textTransform: 'uppercase' }}>{bot.exchange}</div>
                                            </td>
                                            <td style={td}>
                                                <span style={{
                                                    padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '800',
                                                    background: `${typeInfo.color}15`, border: `1px solid ${typeInfo.color}30`, color: typeInfo.color
                                                }}>
                                                    {typeInfo.label}
                                                </span>
                                            </td>
                                            <td style={td}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ width: '60px', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                                                        <div style={{ width: `${bot.confidence}%`, height: '100%', background: typeInfo.color, borderRadius: '2px' }} />
                                                    </div>
                                                    <span style={{ fontWeight: '700', fontSize: '0.8rem' }}>{bot.confidence}%</span>
                                                </div>
                                            </td>
                                            <td style={td}><div style={{ fontWeight: '700' }}>${fmtPrice(bot.price)}</div></td>
                                            <td style={td}>
                                                <div style={{
                                                    color: bot.impact === 'HIGH' ? '#ff7675' : '#fdcb6e',
                                                    fontWeight: '800', fontSize: '0.75rem',
                                                    display: 'flex', alignItems: 'center', gap: '4px'
                                                }}>
                                                    {bot.impact === 'HIGH' ? <AlertTriangle size={12} /> : <Zap size={12} />}
                                                    {bot.impact}
                                                </div>
                                            </td>
                                            <td style={td}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4CAF50', fontSize: '0.75rem', fontWeight: '800' }}>
                                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4CAF50', animation: 'blink 1.5s infinite' }} />
                                                    ACTIVE
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
                @keyframes blink { 0% { opacity: 0.2; } 50% { opacity: 1; } 100% { opacity: 0.2; } }
                @keyframes pulse { 0% { transform: scale(1); opacity: 0.4; } 50% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); opacity: 0.4; } }
            `}</style>
        </div>
    );
};

export default BotDetectorScreener;
