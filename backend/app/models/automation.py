from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Boolean, Float
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base


class AutomationRule(Base):
    __tablename__ = "automation_rules"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)

    name = Column(String, nullable=False)
    rule_type = Column(String, nullable=False)  # schedule | threshold | anomaly
    # schedule: {"frequency": "weekly", "day_of_week": "mon", "hour": 8}
    # threshold: {"metric": "revenue", "direction": "drop", "percent": 10}
    # anomaly: {"sensitivity": "medium"}
    config = Column(JSON, default=dict)

    recipient_email = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)

    last_run_at = Column(DateTime, nullable=True)
    next_run_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="automation_rules")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    rule_id = Column(Integer, ForeignKey("automation_rules.id"), nullable=True)

    alert_type = Column(String, nullable=False)  # anomaly | threshold | scheduled_report | error
    severity = Column(String, nullable=False)  # info | warning | critical
    metric = Column(String, nullable=True)
    value = Column(Float, nullable=True)
    message = Column(String, nullable=False)

    is_acknowledged = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
