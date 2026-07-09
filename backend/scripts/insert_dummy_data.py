import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.product import Product

load_dotenv(".env")
db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("Error: DATABASE_URL not found")
    exit(1)

engine = create_engine(db_url)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

# cek tabel kosong
count = db.query(Product).count()
if count == 0:
    print("Tabel dim_products kosong. Memasukkan data dummy...")
    dummy_products = [
        Product(sku_id="PROD-001", product_name="Kopi Espresso", base_selling_price=15000),
        Product(sku_id="PROD-002", product_name="Kopi Americano", base_selling_price=18000),
        Product(sku_id="PROD-003", product_name="Teh Manis Dingin", base_selling_price=10000),
    ]
    db.add_all(dummy_products)
    db.commit()
    print("data dummy berhasil dimasukkan")
else:
    print(f"tabel sudah ada {count} produk")

db.close()
