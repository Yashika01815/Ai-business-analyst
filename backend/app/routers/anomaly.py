from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db, engine
from app.models.user import User
from app.models.dataset import Dataset
from app.models.analysis import AnalysisRecord
from app.auth import get_current_user
from app.services import analytics
from app.services.anomaly_engine import run_anomaly_detection

router = APIRouter(prefix="/api/anomaly", tags=["anomaly"])


@router.get("/{dataset_id}")
def get_anomalies(dataset_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ds = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.owner_id == current_user.id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    df = analytics.load_dataset_df(engine, ds.table_name)
    results = run_anomaly_detection(df, ds.schema_map)

    record = AnalysisRecord(
        owner_id=current_user.id, dataset_id=ds.id, kind="anomaly",
        title=f"Anomaly scan for {ds.name}",
        input_payload={}, result_payload=results,
    )
    db.add(record)
    db.commit()

    return {"dataset_id": ds.id, **results}
