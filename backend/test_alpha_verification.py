
import asyncio
import time
from app.services import screener_service

async def verify():
    print("🔍 Starting Low-Liq Alpha verification (Real Data)...")
    start_time = time.time()
    
    try:
        results = await screener_service.get_alpha_opportunities()
        end_time = time.time()
        
        print(f"✅ Success! Found {len(results)} alpha opportunities.")
        print(f"⏱️ Execution time: {end_time - start_time:.2f} seconds")
        
        if results:
            print("\nTop 5 alpha opportunities:")
            for r in results[:5]:
                print(f" - {r['exchange']} | {r['symbol']} | Score: {r['alphaScore']}")
                print(f"   Types: {', '.join(r['anomalyTypes'])} | Funding: {r['fundingRate']}% | Spread: {r['spreadVsBinance']}%")
                print(f"   Vol: ${r['volume24h']:,} | Signal: {r['signal']}")
        else:
            print("ℹ️ No alpha opportunities detected. This happens when markets are very efficient.")
            
    except Exception as e:
        print(f"❌ Error during verification: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(verify())
