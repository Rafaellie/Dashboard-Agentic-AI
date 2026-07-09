from sqlalchemy import Column, String, Boolean, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
from sqlalchemy.orm import relationship

class RetailBranch(Base):
    __tablename__ = "retail_branches"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4(), index=True)
    branch_name = Column(String, nullable=False, index=True)
    region = Column(String, nullable=True)
    city = Column(String, nullable=True)
    address = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship to Profile
    profiles = relationship("Profile", back_populates="branch")
