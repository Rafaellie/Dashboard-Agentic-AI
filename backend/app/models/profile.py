from sqlalchemy import Column, String, ForeignKey, DateTime, func, Boolean
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
from sqlalchemy.orm import relationship

class Profile(Base):
    __tablename__ = "profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4(), index=True)
    # email bisa nullable karena kasir mungkin cuma pakai telegram_id
    email = Column(String, unique=True, index=True, nullable=True)
    # role enum: admin, manager, kasir, csuite
    role = Column(String, nullable=False, default="kasir")
    full_name = Column(String, nullable=True)
    # relasi ke branch_id bisa null untuk admin atau csuite
    branch_id = Column(UUID(as_uuid=True), ForeignKey("retail_branches.id"), nullable=True)
    # telegram_id spesifik untuk kasir
    telegram_id = Column(String, unique=True, index=True, nullable=True)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship to RetailBranch
    branch = relationship("RetailBranch", back_populates="profiles")
