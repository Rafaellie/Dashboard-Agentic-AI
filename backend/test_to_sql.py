import pandas as pd
from app.core.database import engine
from sqlalchemy import text

def test_to_sql():
    # 1. Re-enable RLS
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE public.fact_transactions ENABLE ROW LEVEL SECURITY;"))
        conn.execute(text("ALTER TABLE public.fact_inventory_daily ENABLE ROW LEVEL SECURITY;"))
        conn.execute(text("ALTER TABLE public.retail_branches ENABLE ROW LEVEL SECURITY;"))
        conn.commit()
        print("RLS re-enabled.")
    
    # 2. Test inserting a dummy record using to_sql
    df = pd.DataFrame([{
        "source": "csv_import",
        "total_sales": 1000
    }])
    try:
        df.to_sql("fact_transactions", engine, if_exists="append", index=False)
        print("Successfully inserted using to_sql (bypassing RLS securely via DATABASE_URL).")
    except Exception as e:
        print("Error with to_sql:", e)

if __name__ == "__main__":
    test_to_sql()
