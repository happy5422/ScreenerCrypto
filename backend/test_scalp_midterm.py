import asyncio
from app.services import screener_service

async def verify():
    print("🚀 Starting Scalping & Midterm Market Data Verification...\n")
    
    # Verify Scalping
    print("🔎 Validating SCALPING (Order Book Imbalance, CVD, Vol Spike)...")
    scalp_res = await screener_service.get_scalping_opportunities(min_vol_spike=1.0) # Lowered for testing
    print(f"✅ Found {len(scalp_res)} active scalp signals.")
    for r in scalp_res[:3]:
        print(f"   [{r['exchange'].upper()}] {r['symbol']} | {r['signal']}")
        print(f"      CVD: {r['cvd']}% | OB Imbal: {r['obImbalance']}% | VolSpike: {r['volSpike']}x")
        
    print("\n-----------------------------------\n")
    
    # Verify Midterm
    print("🔎 Validating MIDTERM (Open Interest, 1h CVD, Vol Trend)...")
    mid_res = await screener_service.get_midterm_opportunities()
    print(f"✅ Found {len(mid_res)} midterm signals.")
    for r in mid_res[:3]:
        print(f"   [{r['exchange'].upper()}] {r['symbol']} | {r['signal']}")
        print(f"      OI Change: {r['oiChangePct']}% | 1h CVD: {r['cvd1h']}% | VolTrend: {r['volTrend']}")

if __name__ == "__main__":
    asyncio.run(verify())
