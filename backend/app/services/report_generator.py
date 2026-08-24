"""
Business Report Generator: assembles a structured executive report from
real KPI, insight, anomaly, forecast, and recommendation data, with an
optional Gemini-written executive summary narrative.
"""
import json
from typing import Any, Dict, List, Optional

from app.services.gemini_client import generate_text, is_available


def generate_executive_summary(kpis: List[Dict[str, Any]], insights: List[Dict[str, Any]],
                                 anomalies: Dict[str, Any], recommendations: List[Dict[str, Any]],
                                 dataset_name: str) -> str:
    if not is_available():
        return _deterministic_summary(kpis, insights, anomalies, recommendations, dataset_name)

    payload = {
        "dataset": dataset_name,
        "kpis": kpis[:8],
        "insights": insights[:6],
        "anomalies_found": anomalies.get("total_found", 0),
        "top_recommendations": recommendations[:3],
    }
    prompt = f"""You are writing a concise management-level executive summary for a business dataset named "{dataset_name}".
Use ONLY the verified data below (do not invent numbers):
{json.dumps(payload, default=str)[:5000]}

Write 4-6 sentences covering: the most important KPIs, any significant changes or anomalies, and the top recommended actions.
Tone: professional, direct, executive-ready."""
    return generate_text(prompt, temperature=0.4)


def _deterministic_summary(kpis, insights, anomalies, recommendations, dataset_name) -> str:
    lines = [f"Executive Summary — {dataset_name}"]
    if kpis:
        top_kpi = kpis[0]
        lines.append(f"{top_kpi['label']} totals {top_kpi['total']:,.2f}" +
                      (f" ({top_kpi['trend_pct']:+.1f}% trend)." if top_kpi.get("trend_pct") is not None else "."))
    if insights:
        lines.append(insights[0]["explanation"])
    if anomalies.get("total_found", 0) > 0:
        lines.append(f"{anomalies['total_found']} anomaly signal(s) were detected and warrant review.")
    if recommendations:
        lines.append(f"Top recommendation: {recommendations[0]['recommended_action']}")
    return " ".join(lines)


def build_report(dataset_name: str, kpis: List[Dict[str, Any]], charts: List[Dict[str, Any]],
                  insights: List[Dict[str, Any]], anomalies: Dict[str, Any],
                  forecast: Optional[Dict[str, Any]], recommendations: List[Dict[str, Any]],
                  methodology_notes: List[str]) -> Dict[str, Any]:
    summary = generate_executive_summary(kpis, insights, anomalies, recommendations, dataset_name)
    return {
        "dataset_name": dataset_name,
        "executive_summary": summary,
        "kpi_overview": kpis,
        "key_charts": charts[:4],
        "trends_and_insights": insights,
        "anomalies": anomalies,
        "forecast": forecast,
        "recommendations": recommendations,
        "methodology": methodology_notes,
        "assumptions_and_limitations": [
            "All figures are computed directly from the uploaded dataset via SQL/Pandas — none are AI-generated estimates.",
            "Forecasts and what-if impacts are model-based and subject to the stated assumptions.",
            "Correlations reported do not imply causation.",
        ],
    }
