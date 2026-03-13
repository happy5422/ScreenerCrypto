
import asyncio
import time
from app.services import screener_service

async def verify():
    print("🚀 Starting performance test for MEXC Zero-Fee Screener...")
    start_time = time.time()
    
    try:
        results = await screener_service.get_mexc_zero_fee_opportunities()
        end_time = time.time()
        
        print(f"✅ Success! Found {len(results)} opportunities.")
        print(f"⏱️ Execution time: {end_time - start_time:.2f} seconds")
        
        if results:
            print("\nTop 3 opportunities:")
            for r in results[:3]:
                print(f" - {r['symbol']}: Price {r['priceMexc']}, Max Spread {r['maxSpread']}%")
        else:
            print("⚠️ No opportunities found. Check if MEXC client is working or if zero-fee tokens exist.")
            
    except Exception as e:
        print(f"❌ Error during verification: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(verify())
