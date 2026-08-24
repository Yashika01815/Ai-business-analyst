"""
Background scheduler that periodically checks automation rules.
Runs in-process via APScheduler — fine for a single Render web service
instance. For multi-instance deployments, run this as a separate worker.
"""
from apscheduler.schedulers.background import BackgroundScheduler
from app.database import SessionLocal
from app.services.automation_service import run_due_automation
from app.utils.logger import get_logger

logger = get_logger(__name__)
_scheduler = None


def _job():
    db = SessionLocal()
    try:
        run_due_automation(db)
    except Exception as e:
        logger.error(f"Scheduler job failed: {e}")
    finally:
        db.close()


def start_scheduler():
    global _scheduler
    if _scheduler is not None:
        return
    _scheduler = BackgroundScheduler()
    _scheduler.add_job(_job, "interval", minutes=15, id="automation_check", max_instances=1)
    _scheduler.start()
    logger.info("Automation scheduler started (checks every 15 minutes).")


def stop_scheduler():
    global _scheduler
    if _scheduler:
        _scheduler.shutdown(wait=False)
        _scheduler = None
