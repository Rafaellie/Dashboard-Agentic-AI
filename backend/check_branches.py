from app.main import app
from app.core.database import SessionLocal
from app.models.retail_branch import RetailBranch

db = SessionLocal()
branches = db.query(RetailBranch).all()
for b in branches:
    print(f"ID: {b.id}, Name: {b.branch_name}")
db.close()
