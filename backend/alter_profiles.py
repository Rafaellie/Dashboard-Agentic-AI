from app.main import app
from app.core.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    db.execute(text("ALTER TABLE profiles ADD COLUMN email VARCHAR UNIQUE;"))
    db.commit()
    print("Berhasil menambahkan kolom email ke tabel profiles")
except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
