"""
Automated Insights Engine: scans a dataset without any user question and
surfaces meaningful, evidence-backed observations — trends, top/bottom
performers, correlations, and significant period-over-period changes.
"""
from typing import Any, Dict, List
import numpy as np
import pandas as pd


def generate_insights(df: pd.DataFrame, schema_map: Dict[str, Any]) -> List[Dict[str, Any]]:
    insights: List[Dict[str, Any]] = []
    date_col = schema_map.get("primary_date_column")
    metrics = [m for m in schema_map.get("likely_metrics", []) if m in df.columns]
    dims = [d for d in schema_map.get("likely_dimensions", []) if d in df.columns]

    # 1. Period-over-period trend insights
    if date_col and date_col in df.columns:
        for m in metrics[:3]:
            ts = df[[date_col, m]].dropna().copy()
            if len(ts) < 6:
                continue
            ts["_period"] = ts[date_col].dt.to_period("M").astype(str)
            grouped = ts.groupby("_period")[m].sum().reset_index().sort_values("_period")
            if len(grouped) < 2:
                continue
            last, prev = grouped[m].iloc[-1], grouped[m].iloc[-2]
            if prev == 0:
                continue
            change_pct = round(((last - prev) / abs(prev)) * 100, 1)
            if abs(change_pct) >= 5:
                direction = "increased" if change_pct > 0 else "decreased"
                insights.append({
                    "type": "trend",
                    "title": f"{m.replace('_', ' ').title()} {direction} {abs(change_pct)}% month-over-month",
                    "explanation": (
                        f"In the most recent period ({grouped['_period'].iloc[-1]}), "
                        f"{m.replace('_', ' ')} totaled {last:,.2f}, compared to {prev:,.2f} "
                        f"in the prior period — a {change_pct:+.1f}% change."
                    ),
                    "metric": m,
                    "value": float(last),
                    "change_pct": change_pct,
                    "suggested_action": (
                        f"Investigate drivers behind the {'growth' if change_pct > 0 else 'decline'} in {m.replace('_', ' ')} "
                        f"to {'replicate' if change_pct > 0 else 'address'} it next period."
                    ),
                    "severity": "positive" if change_pct > 0 else "warning",
                })

    # 2. Top/bottom performer insights
    if dims and metrics:
        dim, metric = dims[0], metrics[0]
        grouped = df.groupby(dim)[metric].sum().sort_values(ascending=False)
        if len(grouped) >= 2:
            top_name, top_val = grouped.index[0], grouped.iloc[0]
            bottom_name, bottom_val = grouped.index[-1], grouped.iloc[-1]
            share = round((top_val / grouped.sum()) * 100, 1) if grouped.sum() else 0
            insights.append({
                "type": "top_performer",
                "title": f"'{top_name}' leads in {metric.replace('_', ' ')}",
                "explanation": (
                    f"'{top_name}' contributed {top_val:,.2f} in {metric.replace('_', ' ')}, "
                    f"representing {share}% of the total across all {dim.replace('_', ' ')} values."
                ),
                "metric": metric,
                "value": float(top_val),
                "suggested_action": f"Consider reallocating resources toward what makes '{top_name}' successful.",
                "severity": "positive",
            })
            if bottom_val < grouped.mean() * 0.3:
                insights.append({
                    "type": "bottom_performer",
                    "title": f"'{bottom_name}' is significantly underperforming in {metric.replace('_', ' ')}",
                    "explanation": (
                        f"'{bottom_name}' generated only {bottom_val:,.2f} in {metric.replace('_', ' ')}, "
                        f"well below the group average of {grouped.mean():,.2f}."
                    ),
                    "metric": metric,
                    "value": float(bottom_val),
                    "suggested_action": f"Review '{bottom_name}' for potential causes of underperformance.",
                    "severity": "warning",
                })

    # 3. Correlation insights between numeric metrics
    numeric_cols = [c for c in schema_map.get("numeric_columns", []) if c in df.columns]
    if len(numeric_cols) >= 2:
        corr = df[numeric_cols].corr(numeric_only=True)
        seen = set()
        for a in numeric_cols:
            for b in numeric_cols:
                if a == b or (b, a) in seen:
                    continue
                seen.add((a, b))
                val = corr.loc[a, b]
                if pd.notna(val) and abs(val) >= 0.6:
                    direction = "positively" if val > 0 else "negatively"
                    insights.append({
                        "type": "correlation",
                        "title": f"{a.replace('_',' ').title()} and {b.replace('_',' ').title()} are strongly {direction} correlated",
                        "explanation": (
                            f"Across the dataset, {a.replace('_', ' ')} and {b.replace('_', ' ')} show a "
                            f"correlation coefficient of {val:.2f}, indicating a {'strong' if abs(val) > 0.8 else 'moderate'} "
                            f"{direction} relationship. This is an observed statistical association, not confirmed causation."
                        ),
                        "metric": f"{a} vs {b}",
                        "value": float(val),
                        "suggested_action": "Explore this relationship further with the What-If Analysis tool before acting on it.",
                        "severity": "info",
                    })

    if not insights:
        insights.append({
            "type": "info",
            "title": "No strongly significant patterns detected",
            "explanation": "The dataset did not contain period-over-period changes, performer gaps, or correlations large enough to be considered meaningful business signals.",
            "metric": None, "value": None, "suggested_action": None, "severity": "info",
        })

    return insights
