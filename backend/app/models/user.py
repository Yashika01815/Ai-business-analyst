from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    datasets = relationship("Dataset", back_populates="owner", cascade="all, delete-orphan")
    automation_rules = relationship("AutomationRule", back_populates="owner", cascade="all, delete-orphan")
    analyses = relationship("AnalysisRecord", back_populates="owner", cascade="all, delete-orphan")
