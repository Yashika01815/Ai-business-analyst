"""
Email delivery via Resend, used by the Automation Center for scheduled
reports and threshold/anomaly alerts.
"""
from typing import Any, Dict, List, Optional
from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


def is_configured() -> bool:
    return bool(settings.RESEND_API_KEY)


def send_email(to: str, subject: str, html: str) -> Dict[str, Any]:
    if not is_configured():
        logger.warning(f"RESEND_API_KEY not set — skipping email send to {to}. Subject: {subject}")
        return {"status": "skipped", "reason": "RESEND_API_KEY not configured"}
    try:
        import resend
        resend.api_key = settings.RESEND_API_KEY
        response = resend.Emails.send({
            "from": settings.ALERT_FROM_EMAIL,
            "to": [to],
            "subject": subject,
            "html": html,
        })
        logger.info(f"Email sent to {to}: {subject}")
        return {"status": "sent", "response": response}
    except Exception as e:
        logger.error(f"Failed to send email to {to}: {e}")
        return {"status": "error", "error": str(e)}


def render_report_email(dataset_name: str, summary: str, kpis: List[Dict[str, Any]],
                          insights: List[Dict[str, Any]]) -> str:
    kpi_rows = "".join(
        f"<tr><td style='padding:8px 12px;border-bottom:1px solid #eee'>{k['label']}</td>"
        f"<td style='padding:8px 12px;border-bottom:1px solid #eee;text-align:right'>{k['total']:,.2f}</td></tr>"
        for k in kpis[:6]
    )
    insight_items = "".join(f"<li style='margin-bottom:8px'>{i['title']}</li>" for i in insights[:5])
    return f"""
    <div style="font-family: -apple-system, Segoe UI, sans-serif; max-width:600px; margin:auto; color:#1a1a2e;">
      <h2 style="color:#4f46e5;">{dataset_name} — Business Report</h2>
      <p style="line-height:1.6;">{summary}</p>
      <h3>Key Metrics</h3>
      <table style="width:100%; border-collapse:collapse;">{kpi_rows}</table>
      <h3>Top Insights</h3>
      <ul>{insight_items}</ul>
      <p style="color:#888; font-size:12px; margin-top:24px;">Sent automatically by AI Business Analyst.</p>
    </div>
    """


def render_alert_email(dataset_name: str, alert_type: str, message: str, severity: str) -> str:
    color = {"critical": "#dc2626", "warning": "#d97706", "info": "#2563eb"}.get(severity, "#2563eb")
    return f"""
    <div style="font-family: -apple-system, Segoe UI, sans-serif; max-width:600px; margin:auto; color:#1a1a2e;">
      <div style="border-left:4px solid {color}; padding:12px 16px; background:#f9fafb;">
        <h3 style="margin:0 0 8px 0; color:{color}; text-transform:uppercase; font-size:13px; letter-spacing:0.05em;">{severity} · {alert_type}</h3>
        <p style="margin:0; line-height:1.6;">{message}</p>
      </div>
      <p style="color:#888; font-size:12px; margin-top:16px;">Dataset: {dataset_name} · Sent automatically by AI Business Analyst.</p>
    </div>
    """
