from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.database import get_db, engine
from app.models.user import User
from app.models.dataset import Dataset
from app.schemas import DatasetOut, DatasetSummary
from app.auth import get_current_user
from app.services import ingestion, analytics
from app.config import settings
from app.utils.logger import get_logger

router = APIRouter(prefix="/api/datasets", tags=["datasets"])
logger = get_logger(__name__)


@router.post("/upload", response_model=DatasetOut)
async def upload_dataset(
    file: UploadFile = File(...),
    name: str = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not file.filename.lower().endswith((".csv", ".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Only .csv and .xlsx files are supported.")

    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > settings.MAX_UPLOAD_MB:
        raise HTTPException(status_code=400, detail=f"File exceeds the {settings.MAX_UPLOAD_MB}MB limit.")

    try:
        df_raw = ingestion.read_file(content, file.filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read file: {e}")

    if df_raw.empty or len(df_raw.columns) == 0:
        raise HTTPException(status_code=400, detail="The uploaded file appears to be empty.")

    profile = ingestion.profile_dataframe(df_raw)
    df_clean, cleaning_log = ingestion.clean_dataframe(df_raw, profile)
    quality_score = ingestion.compute_quality_score(profile)

    table_name = ingestion.sanitize_table_name(file.filename)
    try:
        ingestion.persist_dataframe(df_clean, table_name, engine)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to store dataset: {e}")

    # Re-detect roles on the cleaned/renamed dataframe for an accurate schema map
    schema_map = ingestion._detect_column_roles(df_clean)

    dataset = Dataset(
        owner_id=current_user.id,
        name=name or file.filename.rsplit(".", 1)[0],
        original_filename=file.filename,
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
    logger.info(f"User {current_user.id} uploaded dataset '{dataset.name}' -> table {table_name}")
    return dataset


@router.get("", response_model=List[DatasetSummary])
def list_datasets(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Dataset).filter(Dataset.owner_id == current_user.id).order_by(Dataset.created_at.desc()).all()


@router.get("/{dataset_id}", response_model=DatasetOut)
def get_dataset(dataset_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ds = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.owner_id == current_user.id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    return ds


@router.get("/{dataset_id}/preview")
def get_preview(dataset_id: int, limit: int = 50, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    ds = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.owner_id == current_user.id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    df = analytics.load_dataset_df(engine, ds.table_name)
    return {"columns": list(df.columns), "rows": ingestion.get_preview(df, limit)}


@router.delete("/{dataset_id}")
def delete_dataset(dataset_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ds = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.owner_id == current_user.id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    try:
        with engine.connect() as conn:
            conn.exec_driver_sql(f'DROP TABLE IF EXISTS "{ds.table_name}"')
            conn.commit()
    except Exception as e:
        logger.warning(f"Could not drop table {ds.table_name}: {e}")
    db.delete(ds)
    db.commit()
    return {"status": "deleted"}
