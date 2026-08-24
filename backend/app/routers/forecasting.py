from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db, engine
from app.models.user import User
from app.models.dataset import Dataset
from app.models.analysis import AnalysisRecord
from app.schemas import ForecastRequest
from app.auth import get_current_user
from app.services import analytics
from app.services.forecasting_engine import run_forecast

router = APIRouter(prefix="/api/forecast", tags=["forecast"])


@router.post("")
def create_forecast(payload: ForecastRequest, db: Session = Depends(get_db),
                     current_user: User = Depends(get_current_user)):
    ds = db.query(Dataset).filter(Dataset.id == payload.dataset_id, Dataset.owner_id == current_user.id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    df = analytics.load_dataset_df(engine, ds.table_name)
    date_col = payload.date_column or ds.schema_map.get("primary_date_column")
    if not date_col:
        raise HTTPException(status_code=400, detail="No date column detected or specified for forecasting.")

    try:
        result = run_forecast(df, date_col, payload.target_metric, payload.horizon, payload.frequency)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    record = AnalysisRecord(
        owner_id=current_user.id, dataset_id=ds.id, kind="forecast",
        title=f"Forecast: {payload.target_metric} ({payload.horizon} periods)",
        input_payload=payload.model_dump(), result_payload=result,
    )
    db.add(record)
    db.commit()

    return {"dataset_id": ds.id, **result}


@router.get("/{dataset_id}/metrics")
def get_forecastable_metrics(dataset_id: int, db: Session = Depends(get_db),
                              current_user: User = Depends(get_current_user)):
    ds = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.owner_id == current_user.id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    return {
        "date_columns": ds.schema_map.get("date_columns", []),
        "metrics": ds.schema_map.get("numeric_columns", []),
        "primary_date_column": ds.schema_map.get("primary_date_column"),
    }
