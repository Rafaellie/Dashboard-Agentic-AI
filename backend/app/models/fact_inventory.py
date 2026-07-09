from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Date, func
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

class FactInventoryDaily(Base):
    __tablename__ = "fact_inventory_daily"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    branch_id = Column(UUID(as_uuid=True), ForeignKey("retail_branches.id", ondelete="SET NULL"), nullable=True, index=True)
    log_date = Column(Date, nullable=False, index=True)
    material_id = Column(String, ForeignKey("dim_materials.material_id", ondelete="SET NULL"), nullable=True, index=True)
    beginning_stock = Column(Float, nullable=True)
    stock_in = Column(Float, nullable=True)
    stock_out_sales = Column(Float, nullable=True)
    stock_out_waste = Column(Float, nullable=True)
    ending_stock_physical = Column(Float, nullable=True)
    batch_expiry_date = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
