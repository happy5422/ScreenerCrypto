
import asyncio
import time
from app.services import screener_service

async def verify():
    print("🔍 Starting MM & Bot Detector verification (Real Data)...")
    start_time = time.time()
    
    try:
        results = await screener_service.get_bot_detection()
        duration = time.time() - start_time
        
        print(f"\n✅ Found {len(results)} bot activities in {duration:.2f}s")
        
        if not results:
            print("⚠️ No anomalies detected. This might be normal during low volatility, or data fetching issue.")
        else:
            for r in results[:10]:
                metrics = r.get('metrics', {})
                print(f"[{r['exchange'].upper()}] {r['symbol']} | {r['botType']} | Conf: {r['confidence']}% | Impact: {r['impact']}")
                print(f"   TPS: {metrics.get('tps')} | WashFreq: {metrics.get('freq')}")
                
    except Exception as e:
        print(f"❌ Verification failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(verify())
