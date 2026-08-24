from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.dataset import Dataset
from app.models.automation import AutomationRule, Alert
from app.schemas import AutomationRuleCreate, AutomationRuleOut, AlertOut
from app.auth import get_current_user
from app.services.automation_service import compute_next_run

router = APIRouter(prefix="/api/automation", tags=["automation"])


@router.post("/rules", response_model=AutomationRuleOut)
def create_rule(payload: AutomationRuleCreate, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    ds = db.query(Dataset).filter(Dataset.id == payload.dataset_id, Dataset.owner_id == current_user.id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    rule = AutomationRule(
        owner_id=current_user.id,
        dataset_id=payload.dataset_id,
        name=payload.name,
        rule_type=payload.rule_type,
        config=payload.config,
        recipient_email=payload.recipient_email,
        is_active=True,
    )
    rule.next_run_at = compute_next_run(rule)
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.get("/rules", response_model=List[AutomationRuleOut])
def list_rules(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(AutomationRule).filter(AutomationRule.owner_id == current_user.id).order_by(
        AutomationRule.created_at.desc()).all()


@router.patch("/rules/{rule_id}", response_model=AutomationRuleOut)
def update_rule(rule_id: int, payload: dict, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    rule = db.query(AutomationRule).filter(AutomationRule.id == rule_id, AutomationRule.owner_id == current_user.id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found.")
    for field in ["name", "config", "recipient_email", "is_active"]:
        if field in payload:
            setattr(rule, field, payload[field])
    if "config" in payload:
        rule.next_run_at = compute_next_run(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.delete("/rules/{rule_id}")
def delete_rule(rule_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rule = db.query(AutomationRule).filter(AutomationRule.id == rule_id, AutomationRule.owner_id == current_user.id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found.")
    db.delete(rule)
    db.commit()
    return {"status": "deleted"}


@router.post("/rules/{rule_id}/run-now", response_model=AlertOut)
def run_rule_now(rule_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.services.automation_service import execute_rule
    rule = db.query(AutomationRule).filter(AutomationRule.id == rule_id, AutomationRule.owner_id == current_user.id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found.")
    alert = execute_rule(db, rule)
    if not alert:
        raise HTTPException(status_code=400, detail="Rule did not trigger an alert (no condition met or dataset unavailable).")
    return alert


@router.get("/alerts", response_model=List[AlertOut])
def list_alerts(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Alert).filter(Alert.owner_id == current_user.id).order_by(Alert.created_at.desc()).limit(100).all()


@router.patch("/alerts/{alert_id}/acknowledge", response_model=AlertOut)
def acknowledge_alert(alert_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    alert = db.query(Alert).filter(Alert.id == alert_id, Alert.owner_id == current_user.id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found.")
    alert.is_acknowledged = True
    db.commit()
    db.refresh(alert)
    return alert
