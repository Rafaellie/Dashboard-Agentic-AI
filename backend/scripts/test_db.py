import sys
import os
import asyncio
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.supabase_client import supabase

async def check():
    if supabase is None:
        print("Supabase not configured.")
        return
    
    try:
        tables = ["fact_transactions", "fact_inventory_daily"]
        for table in tables:
            res = supabase.table(table).select("*", count="exact").limit(1).execute()
            print(f"Table {table}: {res.count} rows found.")
    except Exception as e:
        print(f"Error checking table {table}: {e}")

if __name__ == "__main__":
    asyncio.run(check())
