from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.core.database import Base

class SavedView(Base):
    __tablename__ = "saved_views"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    created_by = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    view_name = Column(String, nullable=False)
    department = Column(String, nullable=True)
    description = Column(String, nullable=True)
    config = Column(JSONB, nullable=False, default=dict, server_default="{}")
    scope = Column(String, nullable=False, default="personal", server_default="personal", index=True)
    is_pinned = Column(Boolean, nullable=False, default=False, server_default="false", index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
