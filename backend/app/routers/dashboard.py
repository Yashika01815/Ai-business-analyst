from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db, engine
from app.models.user import User
from app.models.dataset import Dataset
from app.auth import get_current_user
from app.services import analytics

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def _get_owned_dataset(dataset_id: int, db: Session, current_user: User) -> Dataset:
    ds = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.owner_id == current_user.id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    return ds


def _apply_filters(df, filters: Optional[dict]):
    if not filters:
        return df
    for key, value in filters.items():
        if key == "_date_range" or value in (None, "", "all"):
            continue
        if key in df.columns:
            df = df[df[key].astype(str) == str(value)]
    return df


@router.get("/{dataset_id}")
def get_dashboard(dataset_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
                   filter_dim: Optional[str] = Query(None), filter_value: Optional[str] = Query(None)):
    ds = _get_owned_dataset(dataset_id, db, current_user)
    df = analytics.load_dataset_df(engine, ds.table_name)

    if filter_dim and filter_value and filter_dim in df.columns:
        df = df[df[filter_dim].astype(str) == filter_value]

    kpis = analytics.compute_kpis(df, ds.schema_map)
    charts = analytics.suggest_charts(df, ds.schema_map)
    filter_options = analytics.get_filter_options(df, ds.schema_map)

    return {
        "dataset_id": ds.id,
        "dataset_name": ds.name,
        "row_count_after_filter": len(df),
        "kpis": kpis,
        "charts": charts,
        "filter_options": filter_options,
    }
