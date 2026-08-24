"""
AI Recommendation Engine.
Converts verified analytical findings (insights + anomalies) into
specific, prioritized, evidence-backed recommendations. Optionally
enriched with Gemini for natural-language phrasing, but the underlying
evidence and direction always come from real computed data.
"""
from typing import Any, Dict, List


def build_recommendations(insights: List[Dict[str, Any]], anomalies: Dict[str, Any]) -> List[Dict[str, Any]]:
    recommendations = []

    for insight in insights:
        if insight["type"] == "trend" and insight.get("severity") == "warning":
            recommendations.append({
                "title": f"Address the decline in {insight['metric'].replace('_', ' ')}",
                "evidence": insight["explanation"],
                "expected_impact_direction": "positive",
                "priority": "high",
                "confidence": "moderate",
                "recommended_action": (
                    f"Drill into the '{insight['metric']}' breakdown by dimension to isolate which segment "
                    f"is driving the {abs(insight['change_pct'])}% decline, then run a What-If scenario to "
                    f"quantify the impact of corrective spend or pricing changes."
                ),
                "assumptions": ["Based on the most recent two periods of aggregated data."],
            })
        elif insight["type"] == "trend" and insight.get("severity") == "positive":
            recommendations.append({
                "title": f"Double down on the {insight['metric'].replace('_', ' ')} growth",
                "evidence": insight["explanation"],
                "expected_impact_direction": "positive",
                "priority": "medium",
                "confidence": "moderate",
                "recommended_action": (
                    f"Identify which dimension (product, region, or channel) contributed most to the "
                    f"{insight['change_pct']}% increase in {insight['metric'].replace('_', ' ')} and consider "
                    f"increasing investment there."
                ),
                "assumptions": ["Based on the most recent two periods of aggregated data."],
            })
        elif insight["type"] == "bottom_performer":
            recommendations.append({
                "title": f"Review underperformance in {insight['metric'].replace('_', ' ')}",
                "evidence": insight["explanation"],
                "expected_impact_direction": "positive",
                "priority": "medium",
                "confidence": "moderate",
                "recommended_action": insight["suggested_action"],
                "assumptions": ["Comparison is against the group average for the same dimension."],
            })

    for a in anomalies.get("time_series_anomalies", [])[:5]:
        if a["severity"] == "critical":
            recommendations.append({
                "title": f"Investigate the {a['direction']} in {a['metric'].replace('_', ' ')} during {a['period']}",
                "evidence": a["explanation"],
                "expected_impact_direction": "risk_mitigation",
                "priority": "high",
                "confidence": "high",
                "recommended_action": (
                    f"Cross-reference {a['period']} with operational events (promotions, outages, campaigns) "
                    f"to confirm the root cause of this {a['z_score']}-sigma {a['direction']}."
                ),
                "assumptions": ["Statistical anomaly detected via z-score analysis; does not itself prove a business cause."],
            })

    if not recommendations:
        recommendations.append({
            "title": "No high-priority issues detected",
            "evidence": "Automated insight and anomaly scans did not surface significant risks in the current dataset.",
            "expected_impact_direction": "neutral",
            "priority": "low",
            "confidence": "moderate",
            "recommended_action": "Continue monitoring; revisit after the next data refresh.",
            "assumptions": [],
        })

    priority_order = {"high": 0, "medium": 1, "low": 2}
    recommendations.sort(key=lambda r: priority_order.get(r["priority"], 3))
    return recommendations
