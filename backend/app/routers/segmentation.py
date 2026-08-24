from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db, engine
from app.models.user import User
from app.models.dataset import Dataset
from app.models.analysis import AnalysisRecord
from app.schemas import SegmentationRequest
from app.auth import get_current_user
from app.services import analytics
from app.services.segmentation_engine import run_segmentation

router = APIRouter(prefix="/api/segmentation", tags=["segmentation"])


@router.post("")
def create_segmentation(payload: SegmentationRequest, db: Session = Depends(get_db),
                         current_user: User = Depends(get_current_user)):
    ds = db.query(Dataset).filter(Dataset.id == payload.dataset_id, Dataset.owner_id == current_user.id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    df = analytics.load_dataset_df(engine, ds.table_name)
    try:
        result = run_segmentation(df, ds.schema_map, payload.entity_column,
                                   payload.feature_columns, payload.n_clusters)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    record = AnalysisRecord(
        owner_id=current_user.id, dataset_id=ds.id, kind="segmentation",
        title=f"Segmentation on {result['entity_column']}",
        input_payload=payload.model_dump(), result_payload=result,
    )
    db.add(record)
    db.commit()

    return {"dataset_id": ds.id, **result}
