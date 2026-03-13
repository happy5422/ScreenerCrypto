"""
Screener API routes
"""
from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from app.services import screener_service

router = APIRouter(prefix="/screener", tags=["screener"])


@router.get("/status")
async def get_screener_status():
    """Get signal counts across all screeners (for hub cards)"""
    try:
        result = await screener_service.get_screener_status()
        return result
    except Exception as e:
        return {'success': False, 'signals': {}, 'total_signals': 0, 'error': str(e)}


@router.get("/scalping")
async def get_scalping(
    min_vol_spike: float = Query(1.5, description="Minimum volume spike multiplier"),
):
    """Get scalping signals: Vol Spike, CVD, OB Imbalance"""
    try:
        opportunities = await screener_service.get_scalping_opportunities(min_vol_spike)
        return {
            'success': True,
            'count': len(opportunities),
            'opportunities': opportunities
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/grid-zones")
async def get_grid_zones(
    min_atr_squeeze: float = Query(0.3, description="Minimum ATR squeeze ratio (lower = tighter range)")
):
    """Get coins in tight horizontal range — grid trading opportunities"""
    try:
        zones = await screener_service.get_grid_zones()
        return {
            'success': True,
            'count': len(zones),
            'zones': zones
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/basis")
async def get_basis():
    """Get basis/premium between perpetual and quarterly futures (Binance)"""
    try:
        opportunities = await screener_service.get_basis_opportunities()
        return {
            'success': True,
            'count': len(opportunities),
            'opportunities': opportunities
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/alpha")
async def get_alpha(
    max_volume: float = Query(5_000_000, description="Max 24h volume in USD (low liquidity filter)")
):
    """Get low-liquidity alpha opportunities with anomalous funding"""
    try:
        opportunities = await screener_service.get_alpha_opportunities(max_volume)
        return {
            'success': True,
            'count': len(opportunities),
            'opportunities': opportunities
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/bots")
async def get_bots():
    """Detect market maker and bot activity"""
    try:
        bots = await screener_service.get_bot_detection()
        return {
            'success': True,
            'count': len(bots),
            'bots': bots
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/listings")
async def get_listings():
    """Monitor for new coin listings"""
    try:
        listings = await screener_service.get_new_listings()
        return {
            'success': True,
            'count': len(listings),
            'listings': listings
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/iceberg")
async def get_icebergs():
    """Detect hidden 'Iceberg' orders"""
    try:
        icebergs = await screener_service.get_iceberg_orders()
        return {
            'success': True,
            'count': len(icebergs),
            'icebergs': icebergs
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/midterm")
async def get_midterm():
    """Get midterm signals (OI + CVD)"""
    try:
        midterm = await screener_service.get_midterm_opportunities()
        return {
            'success': True,
            'count': len(midterm),
            'midterm': midterm
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sentiment")
async def get_sentiment():
    """Get social sentiment signals"""
    try:
        sentiment = await screener_service.get_sentiment_opportunities()
        return {
            'success': True,
            'count': len(sentiment),
            'sentiment': sentiment
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/mexc-zero-fee")
async def get_mexc_zero_fee():
    """Get tokens on MEXC with 0% maker fee and compare prices"""
    try:
        opportunities = await screener_service.get_mexc_zero_fee_opportunities()
        return {
            'success': True,
            'count': len(opportunities),
            'opportunities': opportunities
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
