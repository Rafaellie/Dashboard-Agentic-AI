from app.main import app
from app.core.database import SessionLocal
from app.models.profile import Profile

db = SessionLocal()
profiles = db.query(Profile).all()
for p in profiles:
    print(f"ID: {p.id}, Email: {p.email}, Role: {p.role}")
