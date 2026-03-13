import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutGrid, ArrowLeftRight, Zap, TrendingUp, Bot,
    Sparkles, Flame, BarChart3, Search, Waves, Eye, ChevronLeft
} from 'lucide-react';
import ScreenerHub, { SCREENERS } from '../components/screener/ScreenerHub';
import ArbitrageScreener from '../components/screener/ArbitrageScreener';
import ScalpingScreener from '../components/screener/ScalpingScreener';
import LiquidationScreener from '../components/screener/LiquidationScreener';
import GridZoneScreener from '../components/screener/GridZoneScreener';
import BasisScreener from '../components/screener/BasisScreener';
import AlphaScreener from '../components/screener/AlphaScreener';
import BotDetectorScreener from '../components/screener/BotDetectorScreener';
import ListingScreener from '../components/screener/ListingScreener';
import IcebergScreener from '../components/screener/IcebergScreener';
import MidtermScreener from '../components/screener/MidtermScreener';
import SentimentScreener from '../components/screener/SentimentScreener';
import ZeroFeeScreener from '../components/screener/ZeroFeeScreener';

// Placeholder stubs for future screeners
const ComingSoon = ({ title, emoji }) => (
    <div style={{
        minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', color: '#444', fontFamily: "'Inter', sans-serif"
    }}>
        <div style={{ fontSize: '3rem', marginBottom: '20px' }}>{emoji}</div>
        <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#333', marginBottom: '8px' }}>{title}</div>
        <div style={{ fontSize: '0.85rem', color: '#333' }}>Скоро появится — в разработке</div>
    </div>
);

const SCREENER_COMPONENTS = {
    hub: null, // Handled separately
    arbitrage: ArbitrageScreener,
    scalping: ScalpingScreener,
    liquidations: LiquidationScreener,
    grid: GridZoneScreener,
    basis: BasisScreener,
    alpha: AlphaScreener,
    bots: BotDetectorScreener,
    listings: ListingScreener,
    iceberg: IcebergScreener,
    midterm: MidtermScreener,
    sentiment: SentimentScreener,
    'mexc-zf': ZeroFeeScreener,
};

const SCREENER_IDS = [
    { id: 'scalping', label: 'Скальпинг', icon: Zap, color: '#FFD700' },
    { id: 'midterm', label: 'Среднесрок', icon: TrendingUp, color: '#4CAF50' },
    { id: 'bots', label: 'Bot Detector', icon: Bot, color: '#a29bfe' },
    { id: 'listings', label: 'Listings', icon: Sparkles, color: '#fd79a8' },
    { id: 'grid', label: 'Grid Zones', icon: LayoutGrid, color: '#00cec9' },
    { id: 'liquidations', label: 'Liquidations', icon: Flame, color: '#FF5722' },
    { id: 'basis', label: 'Basis', icon: BarChart3, color: '#74b9ff' },
    { id: 'alpha', label: 'Alpha', icon: Search, color: '#e17055' },
    { id: 'sentiment', label: 'Sentiment', icon: Waves, color: '#55efc4' },
    { id: 'iceberg', label: 'Iceberg', icon: Eye, color: '#b2bec3' },
    { id: 'mexc-zf', label: 'MEXC 0%', icon: Zap, color: '#4CAF50' },
    { id: 'arbitrage', label: 'Арбитраж', icon: ArrowLeftRight, color: '#FF9800' },
];

const ScreenerPage = () => {
    const [isScannerActive, setIsScannerActive] = useState(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'hub';

    const setActiveTab = (tabId) => setSearchParams({ tab: tabId });

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const response = await fetch('/api/arbitrage/status');
                const data = await response.json();
                setIsScannerActive(data.active);
            } catch {
                setIsScannerActive(false);
            }
        };
        checkStatus();
    }, []);

    if (isScannerActive === null) {
        return <div style={{ minHeight: '100vh', background: '#0a0a0a' }} />;
    }

    if (isScannerActive === false) {
        return (
            <div style={{
                minHeight: '100vh', background: '#0a0a0a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', color: '#fff', fontFamily: "'Inter', sans-serif"
            }}>
                <div style={{
                    padding: '60px', borderRadius: '32px',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
                    textAlign: 'center', maxWidth: '480px'
                }}>
                    <div style={{
                        width: '80px', height: '80px', borderRadius: '24px',
                        background: 'rgba(255,255,255,0.04)', margin: '0 auto 30px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <LayoutGrid size={40} color="#333" />
                    </div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 950, marginBottom: '10px' }}>SCREENERS DISABLED</h2>
                    <p style={{ color: '#555', marginBottom: '40px', lineHeight: '1.6' }}>
                        Глобальный переключатель скринеров выключен. Активируйте его в настройках.
                    </p>
                    <button
                        onClick={() => window.location.href = '/cabinet?tab=settings'}
                        style={{
                            padding: '14px 28px', background: '#fff', color: '#000',
                            border: 'none', borderRadius: '14px', fontSize: '0.95rem',
                            fontWeight: 800, cursor: 'pointer'
                        }}
                    >
                        Перейти в настройки →
                    </button>
                </div>
            </div>
        );
    }

    const isHub = activeTab === 'hub';
    const ActiveComponent = SCREENER_COMPONENTS[activeTab];

    return (
        <div style={{
            maxWidth: '1500px', margin: '0 auto',
            minHeight: '100vh', color: '#e0e0e0',
            fontFamily: "'Inter', sans-serif", paddingBottom: '100px'
        }}>
            {/* Ambient glow */}
            <div style={{
                position: 'fixed', top: '5%', left: '50%', transform: 'translateX(-50%)',
                width: '700px', height: '300px', zIndex: -1, pointerEvents: 'none',
                background: 'radial-gradient(ellipse, rgba(78, 205, 196, 0.06) 0%, transparent 70%)'
            }} />

            <header style={{ textAlign: 'center', marginBottom: '28px', paddingTop: '24px' }}>
                {/* Top nav: back to hub + screener tabs */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {/* Hub button */}
                    {!isHub && (
                        <>
                            <button
                                onClick={() => setActiveTab('hub')}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '7px',
                                    padding: '10px 18px', borderRadius: '14px', border: 'none', cursor: 'pointer',
                                    background: 'rgba(255,255,255,0.04)',
                                    color: '#555',
                                    fontWeight: '800', fontSize: '0.82rem', transition: 'all 0.2s'
                                }}
                            >
                                <ChevronLeft size={14} />
                                <LayoutGrid size={14} color="#555" />
                                HUB
                            </button>
                            <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.06)' }} />
                        </>
                    )}

                    {/* Screener tabs */}
                    <div style={{
                        display: 'inline-flex', flexWrap: 'wrap', justifyContent: 'center',
                        background: 'rgba(15,15,15,0.8)', backdropFilter: 'blur(10px)',
                        padding: '5px', borderRadius: '18px',
                        border: '1px solid rgba(255,255,255,0.05)', gap: '4px'
                    }}>
                        {SCREENER_IDS.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        padding: '8px 14px', borderRadius: '12px', border: 'none',
                                        background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                                        color: isActive ? '#fff' : '#555',
                                        fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer',
                                        boxShadow: isActive ? `0 0 0 1px ${tab.color}33` : 'none',
                                        transition: 'all 0.18s ease'
                                    }}
                                >
                                    <Icon size={13} color={isActive ? tab.color : '#555'} />
                                    {tab.label.toUpperCase()}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </header>

            <main>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        style={{
                            background: 'rgba(18, 18, 18, 0.65)',
                            borderRadius: '28px',
                            minHeight: '650px',
                            border: '1px solid rgba(255,255,255,0.05)',
                            backdropFilter: 'blur(8px)',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
                            overflow: 'hidden'
                        }}
                    >
                        {isHub
                            ? <ScreenerHub onSelectScreener={setActiveTab} />
                            : ActiveComponent
                                ? <ActiveComponent />
                                : <ComingSoon title="Не найдено" emoji="🔍" />
                        }
                    </motion.div>
                </AnimatePresence>
            </main>

            <style>{`body { background: #0a0a0a !important; }`}</style>
        </div>
    );
};

export default ScreenerPage;
