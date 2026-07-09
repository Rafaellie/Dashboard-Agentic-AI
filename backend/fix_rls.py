from sqlalchemy import text
from app.core.database import engine

def fix_policies():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE public.fact_transactions DISABLE ROW LEVEL SECURITY;"))
            print("Disabled RLS for fact_transactions")
        except Exception as e:
            print("Error fact_transactions:", e)
            
        try:
            conn.execute(text("ALTER TABLE public.fact_inventory_daily DISABLE ROW LEVEL SECURITY;"))
            print("Disabled RLS for fact_inventory_daily")
        except Exception as e:
            print("Error fact_inventory_daily:", e)
            
        try:
            conn.execute(text("ALTER TABLE public.retail_branches DISABLE ROW LEVEL SECURITY;"))
            print("Disabled RLS for retail_branches")
        except Exception as e:
            pass
            
        conn.commit()

if __name__ == "__main__":
    fix_policies()
