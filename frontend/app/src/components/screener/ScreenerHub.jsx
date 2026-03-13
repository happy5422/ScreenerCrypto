import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Zap, TrendingUp, Bot, Sparkles, LayoutGrid, Flame,
    BarChart3, Search, Waves, Eye, ExternalLink, Activity,
    ChevronRight, AlertCircle
} from 'lucide-react';

const SCREENERS = [
    {
        id: 'scalping',
        icon: Zap,
        emoji: '⚡',
        title: 'Скальпинг',
        subtitle: '<15 мин',
        description: 'Всплески объёма, дисбаланс стакана, CVD дельта. Лучшие момент для входа здесь прямо сейчас.',
        color: '#FFD700',
        glow: 'rgba(255, 215, 0, 0.15)',
        signalKey: 'scalping',
    },
    {
        id: 'midterm',
        icon: TrendingUp,
        emoji: '📈',
        title: 'Среднесрок',
        subtitle: '15 мин — 4 часа',
        description: 'OI Δ, CVD на 1h, зоны скопления ликвидаций. Видишь тренд раньше толпы.',
        color: '#4CAF50',
        glow: 'rgba(76, 175, 80, 0.15)',
        signalKey: 'midterm',
    },
    {
        id: 'bots',
        icon: Bot,
        emoji: '🤖',
        title: 'MM & Bot Detector',
        subtitle: 'CEX / DEX',
        description: 'Выявление маркетмейкеров и ботов по паттернам стакана. Встань перед ними.',
        color: '#a29bfe',
        glow: 'rgba(162, 155, 254, 0.15)',
        signalKey: 'bots',
    },
    {
        id: 'listings',
        icon: Sparkles,
        emoji: '🆕',
        title: 'New Listings',
        subtitle: 'CEX / DEX',
        description: 'Первые минуты после листинга — самые прибыльные. Алерт до старта торгов.',
        color: '#fd79a8',
        glow: 'rgba(253, 121, 168, 0.15)',
        signalKey: 'listings',
    },
    {
        id: 'grid',
        icon: LayoutGrid,
        emoji: '📦',
        title: 'Grid Zones',
        subtitle: '30 мин — 4 часа',
        description: 'Монеты в горизонтальном канале — идеально для сетки. 1–2% на каждом отскоке.',
        color: '#00cec9',
        glow: 'rgba(0, 206, 201, 0.15)',
        signalKey: 'grid',
    },
    {
        id: 'liquidations',
        icon: Flame,
        emoji: '💥',
        title: 'Post-Liquidation',
        subtitle: '<5 мин',
        description: 'После каскадных ликвидаций цена отскакивает. Ловим механический откат.',
        color: '#FF5722',
        glow: 'rgba(255, 87, 34, 0.15)',
        signalKey: 'liquidations',
    },
    {
        id: 'basis',
        icon: BarChart3,
        emoji: '📐',
        title: 'Basis / Premium',
        subtitle: '1ч — до экспирации',
        description: 'Разница между бессрочным и квартальным фьючерсом. Предсказуемая конвергенция.',
        color: '#74b9ff',
        glow: 'rgba(116, 185, 255, 0.15)',
        signalKey: 'basis',
    },
    {
        id: 'alpha',
        icon: Search,
        emoji: '🔮',
        title: 'Low-Liq Alpha',
        subtitle: '30 мин — 4 часа',
        description: 'Малоликвидные фьючерсы с аномальным фандингом и тонким стаканом. Почти нет конкуренции.',
        color: '#e17055',
        glow: 'rgba(225, 112, 85, 0.15)',
        signalKey: 'alpha',
    },
    {
        id: 'sentiment',
        icon: Waves,
        emoji: '📡',
        title: 'Sentiment',
        subtitle: '1ч+',
        description: 'Объём соц. активности растёт, цена ещё нет — ранний вход до основного движения.',
        color: '#55efc4',
        glow: 'rgba(85, 239, 196, 0.15)',
        signalKey: 'sentiment',
    },
    {
        id: 'iceberg',
        icon: Eye,
        emoji: '🧊',
        title: 'Iceberg Hunter',
        subtitle: 'любой TF',
        description: 'Скрытые крупные ордера в стакане. Найди уровень интереса институционала.',
        color: '#b2bec3',
        glow: 'rgba(178, 190, 195, 0.15)',
        signalKey: 'iceberg',
    },
    {
        id: 'mexc-zf',
        icon: Zap,
        emoji: '⚡',
        title: 'MEXC Zero-Fee',
        subtitle: 'CEX Arb',
        description: 'Токены с 0% maker-комиссией на фьючерсах MEXC. Сравнение цен с Binance и Bybit в реальном времени.',
        color: '#4CAF50',
        glow: 'rgba(76, 175, 80, 0.15)',
        signalKey: 'mexc_zf',
    },
];

const SignalBadge = ({ count, color }) => {
    if (!count) return null;
    return (
        <div style={{
            background: `${color}22`,
            border: `1px solid ${color}44`,
            color: color,
            borderRadius: '20px',
            padding: '3px 10px',
            fontSize: '0.72rem',
            fontWeight: '800',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            whiteSpace: 'nowrap'
        }}>
            <Activity size={10} />
            {count} сигналов
        </div>
    );
};

const ScreenerCard = ({ screener, signals, onOpen, idx }) => {
    const Icon = screener.icon;
    const sig = signals[screener.signalKey];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04, duration: 0.4, ease: 'easeOut' }}
            whileHover={{ y: -4, scale: 1.01 }}
            onClick={() => onOpen(screener.id)}
            style={{
                background: 'rgba(255,255,255,0.03)',
                backdropFilter: 'blur(10px)',
                border: `1px solid rgba(255,255,255,0.07)`,
                borderRadius: '20px',
                padding: '24px',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                transition: 'box-shadow 0.3s ease',
            }}
            onMouseEnter={e => {
                e.currentTarget.style.boxShadow = `0 8px 40px ${screener.glow}`;
                e.currentTarget.style.borderColor = `${screener.color}33`;
            }}
            onMouseLeave={e => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
            }}
        >
            {/* Glow background */}
            <div style={{
                position: 'absolute', top: 0, right: 0,
                width: '120px', height: '120px',
                background: `radial-gradient(circle, ${screener.glow} 0%, transparent 70%)`,
                borderRadius: '0 20px 0 0',
                pointerEvents: 'none'
            }} />

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{
                    width: '44px', height: '44px', borderRadius: '12px',
                    background: `${screener.color}15`,
                    border: `1px solid ${screener.color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <Icon size={20} color={screener.color} />
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <SignalBadge count={sig?.count} color={screener.color} />
                    <ChevronRight size={16} color="#444" />
                </div>
            </div>

            {/* Title */}
            <div style={{ marginBottom: '6px' }}>
                <div style={{ fontWeight: '900', fontSize: '1.05rem', color: '#fff', marginBottom: '3px' }}>
                    {screener.title}
                </div>
                <div style={{ fontSize: '0.72rem', color: screener.color, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {screener.subtitle}
                </div>
            </div>

            {/* Description */}
            <div style={{ fontSize: '0.82rem', color: '#666', lineHeight: '1.55', marginTop: '10px' }}>
                {screener.description}
            </div>
        </motion.div>
    );
};

const ScreenerHub = ({ onSelectScreener }) => {
    const [signals, setSignals] = useState({});
    const [totalSignals, setTotalSignals] = useState(0);

    // Fetch signal counts from backend
    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await fetch('/api/screener/status');
                if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        setSignals(data.signals || {});
                        setTotalSignals(data.total_signals || 0);
                    }
                }
            } catch {
                // Screener backend not yet available
            }
        };
        fetchStatus();
        const interval = setInterval(fetchStatus, 15000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{ padding: '30px', fontFamily: "'Inter', sans-serif" }}>
            {/* Hub Header */}
            <div style={{ marginBottom: '36px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                    <div style={{
                        fontWeight: '900',
                        fontSize: '1.9rem',
                        color: '#fff',
                        letterSpacing: '-0.5px'
                    }}>
                        Screeners Hub
                    </div>
                    {totalSignals > 0 && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            style={{
                                background: 'rgba(255, 215, 0, 0.15)',
                                border: '1px solid rgba(255, 215, 0, 0.3)',
                                borderRadius: '20px',
                                padding: '5px 14px',
                                fontSize: '0.8rem',
                                fontWeight: '800',
                                color: '#FFD700',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '7px'
                            }}
                        >
                            <Flame size={13} />
                            {totalSignals} активных сигналов
                        </motion.div>
                    )}
                </div>
                <p style={{ color: '#555', margin: 0, fontSize: '0.9rem' }}>
                    10 инструментов. Выбери нужный — от скальпинга до поиска айсбергов.
                </p>
            </div>

            {/* Notice when backend is not active */}
            {totalSignals === 0 && (
                <div style={{
                    marginBottom: '28px',
                    padding: '14px 20px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    color: '#555',
                    fontSize: '0.84rem'
                }}>
                    <AlertCircle size={15} color="#666" />
                    Сигналы появятся после активации скреперов в кабинете
                </div>
            )}

            {/* Cards Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '16px'
            }}>
                {SCREENERS.map((s, idx) => (
                    <ScreenerCard
                        key={s.id}
                        screener={s}
                        signals={signals}
                        onOpen={onSelectScreener}
                        idx={idx}
                    />
                ))}
            </div>
        </div>
    );
};

export default ScreenerHub;
export { SCREENERS };
