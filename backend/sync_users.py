from app.main import app
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv
from app.core.database import SessionLocal
from app.models.profile import Profile

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    # Get all users from Supabase auth.users
    result = conn.execute(text("SELECT id, email FROM auth.users"))
    auth_users = result.fetchall()
    print(f"Found {len(auth_users)} users in auth.users")

    db = SessionLocal()
    for row in auth_users:
        user_id, email = row[0], row[1]
        existing_by_id = db.query(Profile).filter(Profile.id == user_id).first()
        if existing_by_id:
            existing_by_id.email = email
            existing_by_id.role = "admin"
            print(f"Updated profile for {email}")
        else:
            new_profile = Profile(id=user_id, email=email, role="admin")
            db.add(new_profile)
            print(f"Added profile for {email}")
    
    db.commit()
    db.close()
