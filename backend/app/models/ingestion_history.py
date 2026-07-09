from sqlalchemy import Column, String, Integer, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

class IngestionHistory(Base):
    __tablename__ = "ingestion_history"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    filename = Column(String, nullable=False)
    file_hash = Column(String, nullable=False, unique=True, index=True)
    row_count = Column(Integer, nullable=False, default=0)
    status = Column(String, nullable=False, default="success") # success, failed
    error_message = Column(String, nullable=True)
    imported_at = Column(DateTime(timezone=True), server_default=func.now())
