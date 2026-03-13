
import asyncio
import time
from app.services import screener_service

async def verify():
    print("🔭 Starting Iceberg Hunter verification (Real Data)...")
    start_time = time.time()
    
    try:
        results = await screener_service.get_iceberg_orders()
        end_time = time.time()
        
        print(f"✅ Success! Found {len(results)} potential icebergs.")
        print(f"⏱️ Execution time: {end_time - start_time:.2f} seconds")
        
        if results:
            for r in results[:5]:
                print(f" - {r['exchange']} | {r['symbol']} | Side: {r['side']} | Price: {r['price']}")
                print(f"   Hidden Vol: {r['hiddenVolume']} | Visible: {r['visibleVolume']} | Confidence: {r['confidence']}%")
        else:
            print("ℹ️ No icebergs detected in the last minute of trades. This is normal if markets are stable.")
            
    except Exception as e:
        print(f"❌ Error during verification: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(verify())
