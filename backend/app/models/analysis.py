from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base


class AnalysisRecord(Base):
    """
    A saved record of any analytical action: a natural-language question,
    a forecast run, a segmentation run, an anomaly scan, a what-if scenario,
    or a generated report. Powers the Analysis History screen.
    """
    __tablename__ = "analysis_records"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)

    kind = Column(String, nullable=False)  # ask | forecast | segmentation | anomaly | whatif | report | insight
    title = Column(String, nullable=False)
    input_payload = Column(JSON, default=dict)
    result_payload = Column(JSON, default=dict)
    explanation = Column(Text, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="analyses")
