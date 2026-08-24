from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db, engine
from app.models.user import User
from app.models.dataset import Dataset
from app.models.analysis import AnalysisRecord
from app.schemas import AskRequest, AskResponse
from app.auth import get_current_user
from app.services import analytics
from app.services.gemini_orchestrator import answer_question

router = APIRouter(prefix="/api/ask", tags=["ask"])


@router.post("", response_model=AskResponse)
def ask_question(payload: AskRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ds = db.query(Dataset).filter(Dataset.id == payload.dataset_id, Dataset.owner_id == current_user.id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    df = analytics.load_dataset_df(engine, ds.table_name)
    result = answer_question(engine, df, ds.table_name, ds.profile, ds.schema_map, payload.question)

    record = AnalysisRecord(
        owner_id=current_user.id, dataset_id=ds.id, kind="ask",
        title=payload.question,
        input_payload={"question": payload.question},
        result_payload=result,
        explanation=result.get("answer"),
    )
    db.add(record)
    db.commit()

    return result
