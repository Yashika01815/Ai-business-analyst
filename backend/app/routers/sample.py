import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db, engine
from app.models.user import User
from app.models.dataset import Dataset
from app.auth import get_current_user
from app.services import ingestion
from app.utils.logger import get_logger

router = APIRouter(prefix="/api/sample", tags=["sample"])
logger = get_logger(__name__)

SAMPLE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "sample_data")
SAMPLE_DIR = os.path.abspath(SAMPLE_DIR)

AVAILABLE_SAMPLES = {
    "sales": {"file": "sales.csv", "label": "Retail Sales (transactions, revenue, regions, products)"},
    "marketing": {"file": "marketing.csv", "label": "Marketing Campaigns (spend, clicks, conversions)"},
    "customers": {"file": "customers.csv", "label": "Customer Subscriptions (churn, plan tier, revenue)"},
}


@router.get("")
def list_samples():
    return AVAILABLE_SAMPLES


@router.post("/{key}")
def load_sample(key: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if key not in AVAILABLE_SAMPLES:
        raise HTTPException(status_code=404, detail="Unknown sample dataset.")

    path = os.path.join(SAMPLE_DIR, AVAILABLE_SAMPLES[key]["file"])
    if not os.path.exists(path):
        raise HTTPException(status_code=500, detail="Sample data file missing on server.")

    with open(path, "rb") as f:
        content = f.read()

    df_raw = ingestion.read_file(content, AVAILABLE_SAMPLES[key]["file"])
    profile = ingestion.profile_dataframe(df_raw)
    df_clean, cleaning_log = ingestion.clean_dataframe(df_raw, profile)
    quality_score = ingestion.compute_quality_score(profile)
    table_name = ingestion.sanitize_table_name(AVAILABLE_SAMPLES[key]["file"])
    ingestion.persist_dataframe(df_clean, table_name, engine)
    schema_map = ingestion._detect_column_roles(df_clean)

    dataset = Dataset(
        owner_id=current_user.id,
        name=AVAILABLE_SAMPLES[key]["label"],
        original_filename=AVAILABLE_SAMPLES[key]["file"],
        table_name=table_name,
        row_count=len(df_clean),
        column_count=len(df_clean.columns),
        data_quality_score=quality_score,
        profile=profile,
        cleaning_log=cleaning_log,
        schema_map=schema_map,
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)
    return dataset
