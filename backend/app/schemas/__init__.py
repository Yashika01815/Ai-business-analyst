from pydantic import BaseModel, EmailStr, Field
from typing import Any, Optional, List, Dict
from datetime import datetime


# ---------- Auth ----------
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- Datasets ----------
class DatasetOut(BaseModel):
    id: int
    name: str
    original_filename: str
    table_name: str
    row_count: int
    column_count: int
    data_quality_score: float
    profile: Dict[str, Any]
    cleaning_log: List[Any]
    schema_map: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True


class DatasetSummary(BaseModel):
    id: int
    name: str
    row_count: int
    column_count: int
    data_quality_score: float
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Ask Your Data ----------
class AskRequest(BaseModel):
    dataset_id: int
    question: str


class AskResponse(BaseModel):
    answer: str
    tool_used: str
    how_calculated: Dict[str, Any]
    chart: Optional[Dict[str, Any]] = None
    data: Optional[Any] = None


# ---------- Forecasting ----------
class ForecastRequest(BaseModel):
    dataset_id: int
    target_metric: str
    date_column: Optional[str] = None
    horizon: int = 30
    frequency: Optional[str] = None  # D, W, M inferred if not given


# ---------- Segmentation ----------
class SegmentationRequest(BaseModel):
    dataset_id: int
    entity_column: Optional[str] = None
    feature_columns: Optional[List[str]] = None
    n_clusters: Optional[int] = None


# ---------- What-if ----------
class WhatIfRequest(BaseModel):
    dataset_id: int
    target_metric: str
    driver_column: str
    change_percent: float


# ---------- Automation ----------
class AutomationRuleCreate(BaseModel):
    dataset_id: int
    name: str
    rule_type: str  # schedule | threshold | anomaly
    config: Dict[str, Any]
    recipient_email: EmailStr


class AutomationRuleOut(BaseModel):
    id: int
    dataset_id: int
    name: str
    rule_type: str
    config: Dict[str, Any]
    recipient_email: str
    is_active: bool
    last_run_at: Optional[datetime] = None
    next_run_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AlertOut(BaseModel):
    id: int
    dataset_id: int
    alert_type: str
    severity: str
    metric: Optional[str] = None
    value: Optional[float] = None
    message: str
    is_acknowledged: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Analysis History ----------
class AnalysisRecordOut(BaseModel):
    id: int
    dataset_id: int
    kind: str
    title: str
    input_payload: Dict[str, Any]
    result_payload: Dict[str, Any]
    explanation: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
