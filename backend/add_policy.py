from sqlalchemy import text
from app.core.database import engine

def create_policies():
    with engine.connect() as conn:
        try:
            conn.execute(text("CREATE POLICY \"Enable insert for all users\" ON public.fact_transactions FOR INSERT WITH CHECK (true);"))
            print("Policy created for fact_transactions")
        except Exception as e:
            print("Error creating policy for fact_transactions:", e)
            
        try:
            conn.execute(text("CREATE POLICY \"Enable insert for all users\" ON public.fact_inventory_daily FOR INSERT WITH CHECK (true);"))
            print("Policy created for fact_inventory_daily")
        except Exception as e:
            print("Error creating policy for fact_inventory_daily:", e)
        
        conn.commit()

if __name__ == "__main__":
    create_policies()
