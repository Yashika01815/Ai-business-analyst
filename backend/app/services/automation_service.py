"""
Automation engine: evaluates schedule / threshold / anomaly rules,
compares the latest dataset snapshot to the previous one, generates a
Groq-powered explanation, and sends email via Resend. Also drives the
Alert Center.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.database import engine
from app.models.dataset import Dataset, DatasetSnapshot
from app.models.automation import AutomationRule, Alert
from app.services import analytics
from app.services.insights_engine import generate_insights
from app.services.anomaly_engine import run_anomaly_detection
from app.services.report_generator import generate_executive_summary
from app.services.recommendation_engine import build_recommendations
from app.services import email_service
from app.utils.logger import get_logger

logger = get_logger(__name__)


def compute_next_run(rule: AutomationRule) -> Optional[datetime]:
    now = datetime.now(timezone.utc)
    if rule.rule_type != "schedule":
        return None
    freq = (rule.config or {}).get("frequency", "weekly")
    hour = int((rule.config or {}).get("hour", 8))
    if freq == "daily":
        nxt = now.replace(hour=hour, minute=0, second=0, microsecond=0)
        if nxt <= now:
            nxt += timedelta(days=1)
        return nxt
    if freq == "weekly":
        target_day = {"mon": 0, "tue": 1, "wed": 2, "thu": 3, "fri": 4, "sat": 5, "sun": 6}.get(
            (rule.config or {}).get("day_of_week", "mon"), 0)
        days_ahead = (target_day - now.weekday()) % 7
        nxt = (now + timedelta(days=days_ahead)).replace(hour=hour, minute=0, second=0, microsecond=0)
        if nxt <= now:
            nxt += timedelta(days=7)
        return nxt
    if freq == "monthly":
        day = int((rule.config or {}).get("day_of_month", 1))
        month = now.month + 1 if now.day >= day else now.month
        year = now.year + (1 if month > 12 else 0)
        month = month if month <= 12 else 1
        return now.replace(year=year, month=month, day=min(day, 28), hour=hour, minute=0, second=0, microsecond=0)
    return now + timedelta(days=7)


def _snapshot_kpis(db: Session, dataset: Dataset) -> dict:
    df = analytics.load_dataset_df(engine, dataset.table_name)
    kpis = analytics.compute_kpis(df, dataset.schema_map)
    return {k["metric_key"]: k["total"] for k in kpis if k.get("total") is not None}


def _create_snapshot(db: Session, dataset: Dataset) -> DatasetSnapshot:
    kpis = _snapshot_kpis(db, dataset)
    snap = DatasetSnapshot(dataset_id=dataset.id, kpis=kpis)
    db.add(snap)
    db.commit()
    db.refresh(snap)
    return snap


def _previous_snapshot(db: Session, dataset_id: int) -> Optional[DatasetSnapshot]:
    return (db.query(DatasetSnapshot)
            .filter(DatasetSnapshot.dataset_id == dataset_id)
            .order_by(DatasetSnapshot.created_at.desc())
            .offset(1).limit(1).first())


def execute_rule(db: Session, rule: AutomationRule) -> Optional[Alert]:
    dataset = db.query(Dataset).filter(Dataset.id == rule.dataset_id).first()
    if not dataset:
        logger.warning(f"Rule {rule.id} references missing dataset {rule.dataset_id}")
        return None

    df = analytics.load_dataset_df(engine, dataset.table_name)
    alert = None

    if rule.rule_type == "schedule":
        kpis = analytics.compute_kpis(df, dataset.schema_map)
        insights = generate_insights(df, dataset.schema_map)
        summary = generate_executive_summary(kpis, insights, {"total_found": 0}, [], dataset.name)
        html = email_service.render_report_email(dataset.name, summary, kpis, insights)
        email_result = email_service.send_email(rule.recipient_email, f"{dataset.name} — Scheduled Report", html)
        alert = Alert(owner_id=rule.owner_id, dataset_id=dataset.id, rule_id=rule.id,
                       alert_type="scheduled_report", severity="info", metric=None, value=None,
                       message=f"Scheduled report sent to {rule.recipient_email} ({email_result['status']}).")

    elif rule.rule_type == "threshold":
        cfg = rule.config or {}
        metric = cfg.get("metric")
        direction = cfg.get("direction", "drop")
        percent = float(cfg.get("percent", 10))

        _create_snapshot(db, dataset)
        prev = _previous_snapshot(db, dataset.id)
        latest = (db.query(DatasetSnapshot).filter(DatasetSnapshot.dataset_id == dataset.id)
                  .order_by(DatasetSnapshot.created_at.desc()).first())

        if prev and latest and metric in (prev.kpis or {}) and metric in (latest.kpis or {}):
            old_val, new_val = prev.kpis[metric], latest.kpis[metric]
            if old_val:
                change_pct = ((new_val - old_val) / abs(old_val)) * 100
                triggered = (direction == "drop" and change_pct <= -percent) or \
                            (direction == "increase" and change_pct >= percent)
                if triggered:
                    message = (f"{metric.replace('_',' ').title()} {'dropped' if change_pct < 0 else 'increased'} "
                               f"by {abs(change_pct):.1f}% (from {old_val:,.2f} to {new_val:,.2f}), "
                               f"crossing your {percent}% threshold.")
                    html = email_service.render_alert_email(dataset.name, "threshold", message,
                                                              "critical" if abs(change_pct) > percent * 2 else "warning")
                    email_service.send_email(rule.recipient_email, f"{dataset.name} — Threshold Alert", html)
                    alert = Alert(owner_id=rule.owner_id, dataset_id=dataset.id, rule_id=rule.id,
                                  alert_type="threshold", severity="critical" if abs(change_pct) > percent * 2 else "warning",
                                  metric=metric, value=float(new_val), message=message)

    elif rule.rule_type == "anomaly":
        results = run_anomaly_detection(df, dataset.schema_map)
        critical = [a for a in results["time_series_anomalies"] if a["severity"] == "critical"]
        if critical:
            top = critical[0]
            html = email_service.render_alert_email(dataset.name, "anomaly", top["explanation"], "critical")
            email_service.send_email(rule.recipient_email, f"{dataset.name} — Anomaly Detected", html)
            alert = Alert(owner_id=rule.owner_id, dataset_id=dataset.id, rule_id=rule.id,
                          alert_type="anomaly", severity="critical", metric=top["metric"],
                          value=top["value"], message=top["explanation"])

    rule.last_run_at = datetime.now(timezone.utc)
    if rule.rule_type == "schedule":
        rule.next_run_at = compute_next_run(rule)
    db.commit()

    if alert:
        db.add(alert)
        db.commit()
        db.refresh(alert)
    return alert


def run_due_automation(db: Session) -> None:
    """Called periodically by the scheduler; runs any due schedule rules
    and re-checks threshold/anomaly rules."""
    now = datetime.now(timezone.utc)
    rules = db.query(AutomationRule).filter(AutomationRule.is_active == True).all()  # noqa: E712
    for rule in rules:
        try:
            if rule.rule_type == "schedule":
                if rule.next_run_at and rule.next_run_at.replace(tzinfo=timezone.utc) <= now:
                    execute_rule(db, rule)
            else:
                execute_rule(db, rule)
        except Exception as e:
            logger.error(f"Automation rule {rule.id} failed: {e}")
