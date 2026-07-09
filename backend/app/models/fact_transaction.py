from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

class FactTransaction(Base):
    __tablename__ = "fact_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    owner_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True)
    branch_id = Column(UUID(as_uuid=True), ForeignKey("retail_branches.id", ondelete="SET NULL"), nullable=True)
    transaction_id = Column(String, nullable=False, index=True)
    date = Column(DateTime(timezone=True), nullable=False, index=True)
    region = Column(String, nullable=True)
    city = Column(String, nullable=True)
    outlet_name = Column(String, nullable=True)
    product_name = Column(String, nullable=True, index=True)
    sku_variant = Column(String, nullable=True, index=True)
    category = Column(String, nullable=True, index=True)
    qty_sold = Column(Integer, nullable=True)
    price_per_unit = Column(Float, nullable=True)
    total_sales = Column(Float, nullable=True)
    sales_channel = Column(String, nullable=True, index=True)
    shipping_method = Column(String, nullable=True)
    shipping_cost = Column(Float, nullable=True)
    payment_method = Column(String, nullable=True)
    payment_status = Column(String, nullable=True)
    platform_fee = Column(Float, nullable=True)
    stock_remaining = Column(Float, nullable=True)
    cogs_total = Column(Float, nullable=True)
    waste_qty = Column(Integer, nullable=True)
    waste_reason = Column(String, nullable=True)
    cust_demographic = Column(String, nullable=True)
    source = Column(String, nullable=False, default="manual", server_default="manual", index=True)
    kasir_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
