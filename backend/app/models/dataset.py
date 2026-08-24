from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Float
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base


class Dataset(Base):
    """
    Metadata about an uploaded dataset. The actual row-level data is
    materialized into its own SQL table named `table_name` so that it can
    be queried efficiently with SQL for aggregations.
    """
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    table_name = Column(String, unique=True, nullable=False)  # sanitized SQL table name

    row_count = Column(Integer, default=0)
    column_count = Column(Integer, default=0)
    data_quality_score = Column(Float, default=0.0)

    # Rich profiling info: dtypes, missing values, outliers, detected roles, etc.
    profile = Column(JSON, default=dict)
    # List of cleaning operations applied (never silent)
    cleaning_log = Column(JSON, default=list)
    # Detected metrics/dimensions used to auto-build KPIs & charts
    schema_map = Column(JSON, default=dict)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="datasets")


class DatasetSnapshot(Base):
    """
    Point-in-time snapshot of key KPI values for a dataset, used by the
    automation engine to detect meaningful changes between runs.
    """
    __tablename__ = "dataset_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    kpis = Column(JSON, default=dict)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
