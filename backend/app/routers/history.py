from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.analysis import AnalysisRecord
from app.schemas import AnalysisRecordOut
from app.auth import get_current_user

router = APIRouter(prefix="/api/history", tags=["history"])


@router.get("", response_model=List[AnalysisRecordOut])
def list_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
                  dataset_id: Optional[int] = Query(None), kind: Optional[str] = Query(None),
                  limit: int = 100):
    q = db.query(AnalysisRecord).filter(AnalysisRecord.owner_id == current_user.id)
    if dataset_id:
        q = q.filter(AnalysisRecord.dataset_id == dataset_id)
    if kind:
        q = q.filter(AnalysisRecord.kind == kind)
    return q.order_by(AnalysisRecord.created_at.desc()).limit(limit).all()
