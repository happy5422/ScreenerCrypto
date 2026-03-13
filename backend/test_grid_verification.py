
import asyncio
import time
from app.services import screener_service

async def verify():
    print("🔍 Starting Grid Zones verification (Real Data)...")
    start_time = time.time()
    
    try:
        results = await screener_service.get_grid_zones()
        end_time = time.time()
        
        print(f"✅ Success! Found {len(results)} grid opportunities.")
        print(f"⏱️ Execution time: {end_time - start_time:.2f} seconds")
        
        if results:
            print("\nTop 5 grid opportunities:")
            for r in results[:5]:
                print(f" - {r['exchange']} | {r['symbol']} | Score: {r['score']}")
                print(f"   Price: {r['price']} | Range: {r['channelLow']} - {r['channelHigh']} ({r['channelWidthPct']}%)")
                print(f"   Pos: {r['posInChannel']}% | VolSurge: {r['volSurge']}x | Action: {r['action']}")
        else:
            print("ℹ️ No grid opportunities detected with current strict filters.")
            
    except Exception as e:
        print(f"❌ Error during verification: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(verify())
