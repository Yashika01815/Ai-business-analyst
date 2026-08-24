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
from app.services.report_generator import build_report
from app.services.forecasting_engine import run_forecast

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/{dataset_id}")
def get_report(dataset_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ds = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.owner_id == current_user.id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    df = analytics.load_dataset_df(engine, ds.table_name)
    kpis = analytics.compute_kpis(df, ds.schema_map)
    charts = analytics.suggest_charts(df, ds.schema_map)
    insights = generate_insights(df, ds.schema_map)
    anomalies = run_anomaly_detection(df, ds.schema_map)
    recommendations = build_recommendations(insights, anomalies)

    forecast = None
    date_col = ds.schema_map.get("primary_date_column")
    metrics = ds.schema_map.get("likely_metrics", [])
    if date_col and metrics:
        try:
            forecast = run_forecast(df, date_col, metrics[0], horizon=30)
        except Exception:
            forecast = None

    methodology_notes = [
        "Data cleaning: duplicate removal, median/mode imputation, date normalization (see Data Quality Center for full log).",
        "KPIs computed via direct Pandas aggregation on the cleaned, SQL-stored dataset.",
        "Insights: rule-based statistical analysis of trends, top/bottom performers, and Pearson correlations (|r| >= 0.6).",
        "Anomalies: Z-score analysis (|z| >= 2.0) on time-aggregated metrics; IsolationForest for multivariate outliers.",
        "Forecast (if shown): Holt-Winters Exponential Smoothing or Linear Regression fallback, evaluated via holdout MAE/RMSE/MAPE.",
        "Recommendations synthesized from the above verified findings, ranked by priority.",
    ]

    report = build_report(ds.name, kpis, charts, insights, anomalies, forecast, recommendations, methodology_notes)

    record = AnalysisRecord(
        owner_id=current_user.id, dataset_id=ds.id, kind="report",
        title=f"Business report for {ds.name}",
        input_payload={}, result_payload=report,
    )
    db.add(record)
    db.commit()

    return {"dataset_id": ds.id, **report}
