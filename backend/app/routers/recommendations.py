from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db, engine
from app.models.user import User
from app.models.dataset import Dataset
from app.models.analysis import AnalysisRecord
from app.auth import get_current_user
from app.services import analytics
from app.services.insights_engine import generate_insights
from app.services.anomaly_engine import run_anomaly_detection
from app.services.recommendation_engine import build_recommendations

router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])


@router.get("/{dataset_id}")
def get_recommendations(dataset_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ds = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.owner_id == current_user.id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    df = analytics.load_dataset_df(engine, ds.table_name)
    insights = generate_insights(df, ds.schema_map)
    anomalies = run_anomaly_detection(df, ds.schema_map)
    recommendations = build_recommendations(insights, anomalies)

    record = AnalysisRecord(
        owner_id=current_user.id, dataset_id=ds.id, kind="recommendation",
        title=f"Recommendations for {ds.name}",
        input_payload={}, result_payload={"recommendations": recommendations},
    )
    db.add(record)
    db.commit()

    return {"dataset_id": ds.id, "recommendations": recommendations}
