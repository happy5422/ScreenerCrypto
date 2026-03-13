import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, RefreshCw, Filter, ExternalLink, Clock, AlertCircle } from 'lucide-react';

const ArbitrageScreener = () => {
    const [opportunities, setOpportunities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(false);

    // Available exchanges
    const [availableExchanges, setAvailableExchanges] = useState([]);
    const [selectedExchanges, setSelectedExchanges] = useState(['binance', 'bybit']);

    // Filters
    const [ageFilter, setAgeFilter] = useState('all');
    const [minSpread, setMinSpread] = useState(0.2);
    const [minVolume, setMinVolume] = useState(10000); // 24h volume
    const [minVolume30m, setMinVolume30m] = useState(1000); // 30m volume
    const [sortBy, setSortBy] = useState('spread');
    const [sortOrder, setSortOrder] = useState('desc');

    // Copied formula feedback
    const [copiedFormula, setCopiedFormula] = useState(null);

    // Fetch available exchanges on mount
    useEffect(() => {
        const fetchExchanges = async () => {
            try {
                const response = await fetch('/api/arbitrage/exchanges');
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        setAvailableExchanges(data.all_available || []);
                        if (data.active_exchanges) {
                            setSelectedExchanges(data.active_exchanges);
                        }
                    }
                }
            } catch (err) {
                console.error('Error fetching exchanges:', err);
            }
        };
        fetchExchanges();
    }, []);

    const fetchOpportunities = async () => {
        try {
            setLoading(true);
            setError(null);

            const params = new URLSearchParams();
            // Client-side filtering for spread to avoid flickering/re-fetching
            // if (minSpread > 0.2) params.append('min_spread', minSpread); 
            if (ageFilter !== 'all') params.append('age_filter', ageFilter.toUpperCase());

            const response = await fetch(`/api/arbitrage/opportunities?${params}`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                setOpportunities(data.opportunities || []);
                setLastUpdate(data.timestamp || new Date().toISOString());
            } else {
                throw new Error('Failed to fetch opportunities');
            }
        } catch (err) {
            setError(err.message);
            console.error('Error fetching arbitrage opportunities:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOpportunities();

        // Auto-refresh every 10 seconds
        if (autoRefresh) {
            const interval = setInterval(fetchOpportunities, 10000);
            return () => clearInterval(interval);
        }
    }, [minSpread, ageFilter, autoRefresh]);

    // 1. Filter opportunities by selected exchanges
    const filteredByExchange = opportunities.filter(opp => {
        // Show only if BOTH exchanges are in the selected list
        const exchangeMatch = selectedExchanges.includes(opp.buyExchange.toLowerCase()) &&
            selectedExchanges.includes(opp.sellExchange.toLowerCase());

        // Client-side volume filter
        const volumeMatch = opp.volume24h >= minVolume;

        // Client-side 30m volume filter
        const volume30mMatch = !minVolume30m || (opp.volume30m >= minVolume30m);

        // Client-side spread filter
        const spreadMatch = opp.spread >= minSpread;

        return exchangeMatch && spreadMatch && volumeMatch && volume30mMatch;
    });

    // 2. Sort filtered opportunities
    const sortedOpportunities = [...filteredByExchange].sort((a, b) => {
        let valA, valB;

        switch (sortBy) {
            case 'spread':
                valA = a.spread;
                valB = b.spread;
                break;
            case 'age':
                valA = a.ageHours;
                valB = b.ageHours;
                break;
            case 'volume':
                valA = a.volume24h;
                valB = b.volume24h;
                break;
            case 'funding':
                valA = Math.abs(a.fundingDiff);
                valB = Math.abs(b.fundingDiff);
                break;
            default:
                return 0;
        }

        return sortOrder === 'asc' ? valA - valB : valB - valA;
    });

    const getAgeColor = (status) => {
        const colors = {
            'FRESH': '#4CAF50',
            'NEW': '#FFEB3B',
            'RECENT': '#FF9800',
            'AGING': '#FF5722',
            'STALE': '#757575',
        };
        return colors[status] || '#999';
    };

    const getAgeEmoji = (status) => {
        const emojis = {
            'FRESH': '🟢',
            'NEW': '🟡',
            'RECENT': '🟠',
            'AGING': '🔴',
            'STALE': '⚫',
        };
        return emojis[status] || '⚪';
    };

    const formatNumber = (num, decimals = 2) => {
        if (!num && num !== 0) return '0';

        // For exchange prices, we want more precision if the price is low
        if (decimals > 2) {
            return num.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: decimals
            });
        }

        // Standard formatting for percentages etc
        return num.toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    };

    const formatVolume = (volume) => {
        if (!volume && volume !== 0) return '$0';

        if (volume >= 1000000) {
            return `$${(volume / 1000000).toFixed(1)}m`;
        } else if (volume >= 1000) {
            return `$${(volume / 1000).toFixed(1)}k`;
        }
        return `$${volume.toFixed(2)}`;
    };

    const copyToClipboard = async (formula) => {
        try {
            await navigator.clipboard.writeText(formula);
            setCopiedFormula(formula);
            setTimeout(() => setCopiedFormula(null), 2000); // Убрать через 2 секунды
        } catch (err) {
            console.error('Copy error:', err);
            // Fallback для старых браузеров
            const textarea = document.createElement('textarea');
            textarea.value = formula;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            setCopiedFormula(formula);
            setTimeout(() => setCopiedFormula(null), 2000);
        }
    };

    const formatSymbol = (symbol) => {
        // Преобразовать "0G/USDT:USDT" в "0G"
        // Убираем всё после слэша
        return symbol.split('/')[0];
    };

    const formatCountdown = (nextFundingMs) => {
        if (!nextFundingMs) return '';

        const now = Date.now();
        const diff = nextFundingMs - now;

        if (diff <= 0) return '00:00:00';

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        return `${hours}h ${minutes}m`;
    };

    const openExchangeSymbol = (exchange, symbol) => {
        // Убираем всё после слэша и формируем базовый символ
        const cleanSymbol = symbol.replace('/', '').split(':')[0];

        // URL для каждой биржи
        const exchangeUrls = {
            'binance': `https://www.binance.com/en/futures/${cleanSymbol}`,
            'bybit': `https://www.bybit.com/trade/usdt/${cleanSymbol}`,
            'mexc': `https://www.mexc.com/futures/${formatSymbol(symbol)}_USDT`,
            'bingx': `https://bingx.com/futures/forward/${cleanSymbol}`,
            'gate': `https://www.gate.io/futures_trade/USDT/${cleanSymbol.replace('USDT', '_USDT')}`,
            'backpack': `https://backpack.exchange/trade/${formatSymbol(symbol)}_USDC_PERP`,
            'hyperliquid': `https://app.hyperliquid.xyz/trade/${formatSymbol(symbol)}`,
            'astradex': `https://www.asterdex.com/ru/trade/pro/futures/${cleanSymbol}`,
        };

        const url = exchangeUrls[exchange.toLowerCase()];
        if (url) {
            window.open(url, '_blank');
        }
    };

    const toggleExchange = async (exchange) => {
        const prevSelection = [...selectedExchanges];
        const isSelected = selectedExchanges.includes(exchange);
        let newSelection;

        if (isSelected) {
            if (selectedExchanges.length <= 2) {
                alert('Need at least 2 active exchanges for arbitrage search');
                return;
            }
            newSelection = selectedExchanges.filter(ex => ex !== exchange);
        } else {
            newSelection = [...selectedExchanges, exchange];
        }

        // Optimistic update
        setSelectedExchanges(newSelection);

        try {
            const response = await fetch('/api/arbitrage/exchanges', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ exchanges: newSelection })
            });

            if (!response.ok) {
                // Rollback if failed
                console.error('Failed to update exchanges on backend');
                setSelectedExchanges(prevSelection); // Revert to previous state
            } else {
                // Trigger refresh to get new pairs from the newly added exchange
                fetchOpportunities();
            }
        } catch (err) {
            console.error('Error toggling exchange:', err);
            setSelectedExchanges(prevSelection); // Revert to previous state on network error
        }
    };

    return (
        <div style={{ padding: '30px', color: '#e0e0e0' }}>
            {/* Header & Controls */}
            <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
                <div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: '900', margin: 0, marginBottom: '8px', color: '#fff' }}>
                        <TrendingUp size={24} style={{ display: 'inline', marginRight: '10px', verticalAlign: 'middle' }} />
                        Межбиржевой Арбитраж
                    </h2>
                    <p style={{ color: '#666', margin: 0, fontSize: '0.9rem' }}>
                        {lastUpdate && `Обновлено: ${new Date(lastUpdate).toLocaleTimeString()}`}
                        {' • '}
                        {sortedOpportunities.length} opportunities (min. spread {minSpread}%)
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Auto-refresh toggle */}
                    <button
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        style={{
                            padding: '10px 16px',
                            borderRadius: '10px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: autoRefresh ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255,255,255,0.05)',
                            color: autoRefresh ? '#4CAF50' : '#999',
                            fontWeight: '700',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Clock size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                        Auto ({autoRefresh ? 'ON' : 'OFF'})
                    </button>

                    {/* Manual refresh */}
                    <button
                        onClick={fetchOpportunities}
                        disabled={loading}
                        style={{
                            padding: '10px 16px',
                            borderRadius: '10px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.05)',
                            color: '#fff',
                            fontWeight: '700',
                            fontSize: '0.85rem',
                            cursor: loading ? 'wait' : 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        <RefreshCw size={14} style={{ verticalAlign: 'middle', marginRight: '6px', animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Unified Exchange Selection */}
            <div style={{
                marginBottom: '20px',
                padding: '15px 20px',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                display: 'flex',
                gap: '10px',
                alignItems: 'center',
                flexWrap: 'wrap'
            }}>
                <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#999', marginRight: '10px' }}>Exchanges:</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {availableExchanges.map(ex => {
                        const isActive = selectedExchanges.includes(ex);
                        const isDex = ['backpack', 'hyperliquid', 'astradex'].includes(ex);
                        const baseColor = isDex ? '#a29bfe' : '#4ecdc4';
                        const bgColor = isDex ? 'rgba(162, 155, 254, 0.15)' : 'rgba(78, 205, 196, 0.15)';
                        const borderColor = isDex ? 'rgba(162, 155, 254, 0.4)' : 'rgba(78, 205, 196, 0.4)';

                        return (
                            <button
                                key={ex}
                                onClick={() => toggleExchange(ex)}
                                style={{
                                    padding: '8px 16px',
                                    background: isActive ? bgColor : 'rgba(255, 255, 255, 0.03)',
                                    color: isActive ? baseColor : '#666',
                                    borderRadius: '10px',
                                    border: `1px solid ${isActive ? borderColor : 'rgba(255, 255, 255, 0.05)'}`,
                                    fontSize: '0.85rem',
                                    fontWeight: '800',
                                    textTransform: 'uppercase',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                <div style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: isActive ? baseColor : '#333',
                                    boxShadow: isActive ? `0 0 8px ${baseColor}80` : 'none'
                                }} />
                                {ex}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Filters */}
            <div style={{
                marginBottom: '20px',
                display: 'flex',
                gap: '15px',
                flexWrap: 'wrap',
                padding: '20px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.05)'
            }}>
                <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#999', marginBottom: '6px', fontWeight: '600' }}>
                        MIN. SPREAD
                    </label>
                    <input
                        type="number"
                        min="0.1"
                        max="10"
                        step="0.1"
                        value={minSpread}
                        onChange={(e) => setMinSpread(parseFloat(e.target.value) || 0)}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.05)',
                            color: '#fff',
                            width: '80px',
                            fontWeight: '600'
                        }}
                    />
                </div>

                <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#999', marginBottom: '6px', fontWeight: '600' }}>
                        MIN. VOLUME (24h)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                            type="number"
                            min="0"
                            step="1000"
                            value={minVolume}
                            onChange={(e) => setMinVolume(parseInt(e.target.value) || 0)}
                            style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(255,255,255,0.05)',
                                color: '#fff',
                                width: '100px',
                                fontWeight: '600'
                            }}
                        />
                        <span style={{ fontSize: '0.7rem', color: '#666' }}>$</span>
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#999', marginBottom: '6px', fontWeight: '600' }}>
                        MIN. VOL (30m)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                            type="number"
                            min="0"
                            step="100"
                            value={minVolume30m}
                            onChange={(e) => setMinVolume30m(parseInt(e.target.value) || 0)}
                            style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(255,255,255,0.05)',
                                color: '#fff',
                                width: '80px',
                                fontWeight: '600'
                            }}
                        />
                        <span style={{ fontSize: '0.7rem', color: '#666' }}>$</span>
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#999', marginBottom: '6px', fontWeight: '600' }}>
                        TIME
                    </label>
                    <select
                        value={ageFilter}
                        onChange={(e) => setAgeFilter(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.05)',
                            color: '#fff',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="all">All</option>
                        <option value="fresh">🟢 Fresh (&lt;30m)</option>
                        <option value="new">🟡 New (30m-1h)</option>
                        <option value="recent">🟠 Recent (1-24h)</option>
                        <option value="aging">🔴 Aging (1-3d)</option>
                        <option value="stale">⚫ Stale (&gt;3d)</option>
                    </select>
                </div>

                <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#999', marginBottom: '6px', fontWeight: '600' }}>
                        SORT BY
                    </label>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.05)',
                            color: '#fff',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="spread">Spread %</option>
                        <option value="age">Time</option>
                        <option value="volume">Volume</option>
                        <option value="funding">Funding Diff</option>
                    </select>
                </div>

                <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#999', marginBottom: '6px', fontWeight: '600' }}>
                        ORDER
                    </label>
                    <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.05)',
                            color: '#fff',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="desc">High → Low</option>
                        <option value="asc">Low → High</option>
                    </select>
                </div>
            </div>

            {/* Error message */}
            {error && (
                <div style={{
                    padding: '20px',
                    margin: '20px 0',
                    background: 'rgba(255, 87, 34, 0.1)',
                    border: '1px solid rgba(255, 87, 34, 0.3)',
                    borderRadius: '12px',
                    color: '#FF5722'
                }}>
                    <AlertCircle size={16} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                    Error: {error}
                </div>
            )}

            {/* Loading state */}
            {loading && !opportunities.length && (
                <div style={{ textAlign: 'center', padding: '60px', color: '#666' }}>
                    <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '20px' }} />
                    <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>Loading...</div>
                </div>
            )}

            {/* No opportunities */}
            {!loading && sortedOpportunities.length === 0 && !error && (
                <div style={{ textAlign: 'center', padding: '60px', color: '#666' }}>
                    <Filter size={32} style={{ marginBottom: '20px', opacity: 0.3 }} />
                    <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>Opportunities not found</div>
                    <div style={{ fontSize: '0.9rem', marginTop: '8px' }}>Try reducing the minimum spread</div>
                </div>
            )}

            {/* Opportunities table */}
            {sortedOpportunities.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                                <th style={headerStyle}>Symbol</th>
                                <th style={headerStyle}>Time</th>
                                <th style={headerStyle}>Spread %</th>
                                <th style={headerStyle}>Buy</th>
                                <th style={headerStyle}>Sell</th>
                                <th style={headerStyle}>Funding 1</th>
                                <th style={headerStyle}>Funding 2</th>
                                <th style={headerStyle}>Funding Δ</th>
                                <th style={headerStyle}>Vol 24h</th>
                                <th style={headerStyle}>Vol 30m</th>
                                <th style={headerStyle}>Chart</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedOpportunities.map((opp, idx) => (
                                <motion.tr
                                    key={`${opp.symbol}-${opp.buyExchange}-${opp.sellExchange}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.02 }}
                                    style={{
                                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <td style={cellStyle}>
                                        <div style={{ fontWeight: '800', fontSize: '0.95rem' }}>{formatSymbol(opp.symbol)}</div>
                                    </td>
                                    <td style={cellStyle}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span>{getAgeEmoji(opp.ageStatus)}</span>
                                            <span style={{ color: getAgeColor(opp.ageStatus), fontWeight: '700', fontSize: '0.8rem' }}>
                                                {opp.ageHours < 1 ? `${Math.round(opp.ageHours * 60)}m` : `${opp.ageHours.toFixed(1)}h`}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={cellStyle}>
                                        <div style={{
                                            fontWeight: '900',
                                            fontSize: '1.05rem',
                                            color: opp.spread >= 1 ? '#4CAF50' : opp.spread >= 0.5 ? '#FF9800' : '#FFF'
                                        }}>
                                            {formatNumber(opp.spread, 2)}%
                                        </div>
                                    </td>
                                    <td style={cellStyle}>
                                        <div style={{ color: '#4CAF50', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                                            {opp.buyExchange}
                                        </div>
                                        <div
                                            onClick={() => openExchangeSymbol(opp.buyExchange, opp.symbol)}
                                            style={{
                                                color: '#999',
                                                fontSize: '0.8rem',
                                                cursor: 'pointer',
                                                textDecoration: 'underline',
                                                transition: 'color 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.color = '#4CAF50'}
                                            onMouseLeave={(e) => e.currentTarget.style.color = '#999'}
                                            title={`Open ${formatSymbol(opp.symbol)} on ${opp.buyExchange.toUpperCase()}`}
                                        >
                                            ${formatNumber(opp.buyPrice, 8)}
                                        </div>
                                    </td>
                                    <td style={cellStyle}>
                                        <div style={{ color: '#FF5722', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                                            {opp.sellExchange}
                                        </div>
                                        <div
                                            onClick={() => openExchangeSymbol(opp.sellExchange, opp.symbol)}
                                            style={{
                                                color: '#999',
                                                fontSize: '0.8rem',
                                                cursor: 'pointer',
                                                textDecoration: 'underline',
                                                transition: 'color 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.color = '#FF5722'}
                                            onMouseLeave={(e) => e.currentTarget.style.color = '#999'}
                                            title={`Open ${formatSymbol(opp.symbol)} on ${opp.sellExchange.toUpperCase()}`}
                                        >
                                            ${formatNumber(opp.sellPrice, 8)}
                                        </div>
                                    </td>
                                    <td style={cellStyle}>
                                        <div style={{ color: opp.fundingRate1 >= 0 ? '#4CAF50' : '#FF5722', fontSize: '0.85rem' }}>
                                            {opp.fundingRate1 >= 0 ? '+' : ''}{formatNumber(opp.fundingRate1, 4)}%
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: '#666' }}>
                                            ({formatCountdown(opp.nextFundingTime1)})
                                        </div>
                                    </td>
                                    <td style={cellStyle}>
                                        <div style={{ color: opp.fundingRate2 >= 0 ? '#4CAF50' : '#FF5722', fontSize: '0.85rem' }}>
                                            {opp.fundingRate2 >= 0 ? '+' : ''}{formatNumber(opp.fundingRate2, 4)}%
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: '#666' }}>
                                            ({formatCountdown(opp.nextFundingTime2)})
                                        </div>
                                    </td>
                                    <td style={cellStyle}>
                                        <div style={{
                                            fontWeight: '700',
                                            fontSize: '0.85rem',
                                            color: opp.fundingDiff > 0 ? '#4CAF50' : opp.fundingDiff < 0 ? '#FF5722' : '#FFF'
                                        }}>
                                            {opp.fundingDiff > 0 ? '+' : ''}{formatNumber(opp.fundingDiff, 4)}%
                                        </div>
                                    </td>
                                    <td style={cellStyle}>
                                        <span style={{ color: '#999', fontSize: '0.85rem' }}>
                                            {formatVolume(opp.volume24h)}
                                        </span>
                                    </td>
                                    <td style={cellStyle}>
                                        <span style={{
                                            color: opp.volume30m > 1000 ? '#4CAF50' : '#999',
                                            fontSize: '0.85rem',
                                            fontWeight: opp.volume30m > 5000 ? '700' : '400'
                                        }}>
                                            {formatVolume(opp.volume30m)}
                                        </span>
                                    </td>
                                    <td style={cellStyle}>
                                        <button
                                            onClick={() => copyToClipboard(opp.tvFormula)}
                                            title={copiedFormula === opp.tvFormula ? 'Copied!' : `Copy: ${opp.tvFormula}`}
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: '6px',
                                                border: `1px solid ${copiedFormula === opp.tvFormula ? 'rgba(76, 175, 80, 0.5)' : 'rgba(78, 205, 196, 0.3)'}`,
                                                background: copiedFormula === opp.tvFormula ? 'rgba(76, 175, 80, 0.2)' : 'rgba(78, 205, 196, 0.1)',
                                                color: copiedFormula === opp.tvFormula ? '#4CAF50' : '#4ecdc4',
                                                fontSize: '0.7rem',
                                                fontWeight: '700',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                minWidth: '50px'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (copiedFormula !== opp.tvFormula) {
                                                    e.currentTarget.style.background = 'rgba(78, 205, 196, 0.2)';
                                                    e.currentTarget.style.transform = 'scale(1.05)';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (copiedFormula !== opp.tvFormula) {
                                                    e.currentTarget.style.background = 'rgba(78, 205, 196, 0.1)';
                                                    e.currentTarget.style.transform = 'scale(1)';
                                                }
                                            }}
                                        >
                                            {copiedFormula === opp.tvFormula ? '✓ OK' : '📋 TV'}
                                        </button>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

const headerStyle = {
    padding: '16px 12px',
    textAlign: 'left',
    fontSize: '0.75rem',
    fontWeight: '800',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
};

const cellStyle = {
    padding: '16px 12px',
    color: '#e0e0e0'
};

export default ArbitrageScreener;
