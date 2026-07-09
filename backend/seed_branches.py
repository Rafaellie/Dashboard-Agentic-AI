from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.retail_branch import RetailBranch
from app.models.profile import Profile

db = SessionLocal()

branches = [
    {"branch_name": "D'BESTO Depok Margonda", "region": "Jawa Barat", "city": "Depok", "address": "Jl. Margonda Raya No. 1", "is_active": True},
    {"branch_name": "D'BESTO Kemang Raya", "region": "DKI Jakarta", "city": "Jakarta Selatan", "address": "Jl. Kemang Raya No. 10", "is_active": True},
    {"branch_name": "D'BESTO Dago", "region": "Jawa Barat", "city": "Bandung", "address": "Jl. Ir. H. Djuanda No. 99", "is_active": True},
    {"branch_name": "D'BESTO Sudirman", "region": "DKI Jakarta", "city": "Jakarta Pusat", "address": "Jl. Jend. Sudirman", "is_active": True},
    {"branch_name": "D'BESTO Kuta", "region": "Bali", "city": "Badung", "address": "Jl. Pantai Kuta", "is_active": True},
]

for b in branches:
    existing = db.query(RetailBranch).filter(RetailBranch.branch_name == b['branch_name']).first()
    if not existing:
        db.add(RetailBranch(**b))

db.commit()
db.close()
print("Berhasil inject dummy branches!")
