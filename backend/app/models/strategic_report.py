from sqlalchemy import Column, String, DateTime, ForeignKey, Date, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.core.database import Base

class StrategicReport(Base):
    __tablename__ = "strategic_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    created_by = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, nullable=True)
    report_markdown = Column(String, nullable=True)
    analysis_json = Column(JSONB, nullable=True)
    deviations_json = Column(JSONB, nullable=True)
    kpis_snapshot = Column(JSONB, nullable=True)
    period_start = Column(Date, nullable=True)
    period_end = Column(Date, nullable=True)
    model_used = Column(String, nullable=False, default="groq/llama-3.3-70b", server_default="groq/llama-3.3-70b")
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
