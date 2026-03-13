import asyncio
import time
from app.services import screener_service

async def verify_all():
    print("🚀 Starting Full Screener Suite Verification...\n")
    
    tasks = [
        ("MEXC Zero-Fee", screener_service.get_mexc_zero_fee_opportunities),
        ("Iceberg Hunter", screener_service.get_iceberg_orders),
        ("Low-Liq Alpha", screener_service.get_alpha_opportunities),
        ("Grid Zones", screener_service.get_grid_zones),
        ("MM & Bot Detector", screener_service.get_bot_detection),
        ("Scalping", lambda: screener_service.get_scalping_opportunities(min_vol_spike=1.0)),
        ("Midterm", screener_service.get_midterm_opportunities)
    ]
    
    total_found = 0
    passed = 0
    
    for name, func in tasks:
        print(f"[{name}]")
        print("  ⏳ Fetching...")
        start_time = time.time()
        try:
            res = await func()
            duration = time.time() - start_time
            print(f"  ✅ Success in {duration:.2f}s | Found {len(res)} signals")
            if len(res) > 0:
                print(f"  ➡️ Example: {res[0].get('symbol')} on {res[0].get('exchange')}")
            passed += 1
            total_found += len(res)
        except Exception as e:
            print(f"  ❌ Error: {e}")
        print("-" * 40)
        
    print(f"\n🎯 Summary: {passed}/{len(tasks)} screeners passed. Total signals today: {total_found}")

if __name__ == "__main__":
    asyncio.run(verify_all())
