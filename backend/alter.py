from sqlalchemy import text
from app.core.database import SessionLocal

db = SessionLocal()
try:
    db.execute(text("ALTER TABLE retail_branches RENAME COLUMN name TO branch_name;"))
    db.commit()
    print("Berhasil rename kolom name ke branch_name")
except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
