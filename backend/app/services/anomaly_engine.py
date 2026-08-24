"""
Anomaly Detection Engine.
Combines a statistical z-score / IQR approach on time-aggregated metrics
with an IsolationForest multivariate detector for row-level anomalies,
whichever is appropriate for the available data.
"""
from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest


def detect_time_series_anomalies(df: pd.DataFrame, date_col: str, metric: str) -> List[Dict[str, Any]]:
    ts = df[[date_col, metric]].dropna().copy()
    if len(ts) < 8:
        return []
    ts["_period"] = ts[date_col].dt.to_period("D" if ts[date_col].dt.date.nunique() > 60 else "W").astype(str)
    grouped = ts.groupby("_period")[metric].sum().reset_index().sort_values("_period")
    values = grouped[metric]
    mean, std = values.mean(), values.std()
    if std == 0 or pd.isna(std):
        return []
    grouped["z_score"] = (values - mean) / std

    anomalies = []
    for _, row in grouped.iterrows():
        if abs(row["z_score"]) >= 2.0:
            severity = "critical" if abs(row["z_score"]) >= 3.0 else "warning"
            direction = "spike" if row["z_score"] > 0 else "drop"
            anomalies.append({
                "period": row["_period"],
                "metric": metric,
                "value": float(row[metric]),
                "expected_range": [float(mean - 2 * std), float(mean + 2 * std)],
                "z_score": round(float(row["z_score"]), 2),
                "direction": direction,
                "severity": severity,
                "explanation": (
                    f"{metric.replace('_', ' ').title()} in period {row['_period']} was {row[metric]:,.2f}, "
                    f"a {direction} of {abs(row['z_score']):.1f} standard deviations from the typical value "
                    f"of {mean:,.2f} (± {std:,.2f})."
                ),
            })
    return anomalies


def detect_multivariate_anomalies(df: pd.DataFrame, numeric_cols: List[str], dims: List[str],
                                   contamination: float = 0.03) -> List[Dict[str, Any]]:
    usable_cols = [c for c in numeric_cols if c in df.columns and df[c].notna().sum() > 10]
    if len(usable_cols) < 1 or len(df) < 20:
        return []

    X = df[usable_cols].fillna(df[usable_cols].median())
    model = IsolationForest(contamination=contamination, random_state=42, n_estimators=200)
    preds = model.fit_predict(X)
    scores = model.decision_function(X)

    anomaly_idx = np.where(preds == -1)[0]
    results = []
    for idx in anomaly_idx[:25]:
        row = df.iloc[idx]
        associated_dims = {d: str(row[d]) for d in dims if d in df.columns}
        row_values = {c: float(row[c]) for c in usable_cols if pd.notna(row[c])}
        results.append({
            "row_index": int(idx),
            "anomaly_score": round(float(-scores[idx]), 3),
            "severity": "critical" if -scores[idx] > 0.15 else "warning",
            "associated_dimensions": associated_dims,
            "values": row_values,
            "explanation": (
                "This record's combination of "
                + ", ".join(f"{k}={v:,.2f}" for k, v in list(row_values.items())[:3])
                + " is statistically unusual relative to the rest of the dataset."
            ),
        })
    return results


def run_anomaly_detection(df: pd.DataFrame, schema_map: Dict[str, Any]) -> Dict[str, Any]:
    date_col = schema_map.get("primary_date_column")
    metrics = [m for m in schema_map.get("likely_metrics", []) if m in df.columns]
    numeric_cols = [c for c in schema_map.get("numeric_columns", []) if c in df.columns]
    dims = [d for d in schema_map.get("likely_dimensions", []) if d in df.columns]

    time_series_anomalies = []
    if date_col:
        for m in metrics[:3]:
            time_series_anomalies.extend(detect_time_series_anomalies(df, date_col, m))

    multivariate_anomalies = detect_multivariate_anomalies(df, numeric_cols, dims)

    return {
        "time_series_anomalies": time_series_anomalies,
        "multivariate_anomalies": multivariate_anomalies,
        "method": "Z-score analysis (|z| >= 2.0) on time-aggregated metrics; IsolationForest for multivariate row-level outliers.",
        "total_found": len(time_series_anomalies) + len(multivariate_anomalies),
    }
