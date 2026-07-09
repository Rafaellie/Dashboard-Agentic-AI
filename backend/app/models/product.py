from sqlalchemy import Column, String, Boolean, Float, Integer, DateTime, func
from app.core.database import Base

class Product(Base):
    __tablename__ = "dim_products"
    
    sku_id = Column(String, primary_key=True, index=True)
    product_name = Column(String, index=True)
    category = Column(String, index=True, nullable=True)
    sub_category = Column(String, nullable=True)
    base_selling_price = Column(Float, nullable=True)
    preparation_time_min = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
