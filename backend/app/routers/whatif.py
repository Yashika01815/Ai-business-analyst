from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db, engine
from app.models.user import User
from app.models.dataset import Dataset
from app.models.analysis import AnalysisRecord
from app.schemas import WhatIfRequest
from app.auth import get_current_user
from app.services import analytics
from app.services.whatif_engine import run_whatif

router = APIRouter(prefix="/api/whatif", tags=["whatif"])


@router.post("")
def create_whatif(payload: WhatIfRequest, db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_user)):
    ds = db.query(Dataset).filter(Dataset.id == payload.dataset_id, Dataset.owner_id == current_user.id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    df = analytics.load_dataset_df(engine, ds.table_name)
    try:
        result = run_whatif(df, ds.schema_map, payload.target_metric, payload.driver_column, payload.change_percent)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    record = AnalysisRecord(
        owner_id=current_user.id, dataset_id=ds.id, kind="whatif",
        title=f"What-if: {payload.driver_column} {payload.change_percent:+.1f}% -> {payload.target_metric}",
        input_payload=payload.model_dump(), result_payload=result,
    )
    db.add(record)
    db.commit()

    return {"dataset_id": ds.id, **result}
