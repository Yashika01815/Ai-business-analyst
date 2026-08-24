"""
Decision Simulator / What-If Analysis engine.
Fits an explicit linear regression model relating a driver column to a
target metric (aggregated to avoid noise) and uses its coefficient to
estimate the impact of a hypothetical change. All outputs are clearly
labeled as model-based estimates, never causal claims.
"""
from typing import Any, Dict, Optional
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score


def run_whatif(df: pd.DataFrame, schema_map: Dict[str, Any], target_metric: str,
                driver_column: str, change_percent: float) -> Dict[str, Any]:
    if target_metric not in df.columns:
        raise ValueError(f"Target metric '{target_metric}' not found in dataset.")
    if driver_column not in df.columns:
        raise ValueError(f"Driver column '{driver_column}' not found in dataset.")

    date_col = schema_map.get("primary_date_column")
    numeric_driver = pd.api.types.is_numeric_dtype(df[driver_column])

    if not numeric_driver:
        raise ValueError(
            f"'{driver_column}' is not numeric, so a quantitative what-if impact cannot be estimated from this dataset."
        )

    work = df[[driver_column, target_metric] + ([date_col] if date_col else [])].dropna()
    if len(work) < 10:
        raise ValueError("Not enough overlapping data points between driver and target to fit a reliable model.")

    if date_col:
        work["_period"] = work[date_col].dt.to_period("W").astype(str)
        agg = work.groupby("_period").agg({driver_column: "sum", target_metric: "sum"}).reset_index()
    else:
        agg = work

    if len(agg) < 6:
        raise ValueError("Not enough aggregated periods to fit a reliable what-if model.")

    X = agg[[driver_column]].values
    y = agg[target_metric].values

    model = LinearRegression().fit(X, y)
    r2 = r2_score(y, model.predict(X))

    baseline_driver = float(agg[driver_column].mean())
    baseline_target = float(model.predict([[baseline_driver]])[0])

    scenario_driver = baseline_driver * (1 + change_percent / 100)
    scenario_target = float(model.predict([[scenario_driver]])[0])

    impact_abs = scenario_target - baseline_target
    impact_pct = (impact_abs / baseline_target * 100) if baseline_target else None

    confidence = "low" if r2 < 0.3 else ("moderate" if r2 < 0.6 else "high")

    return {
        "target_metric": target_metric,
        "driver_column": driver_column,
        "change_percent": change_percent,
        "baseline": {"driver_value": round(baseline_driver, 2), "target_value": round(baseline_target, 2)},
        "scenario": {"driver_value": round(scenario_driver, 2), "target_value": round(scenario_target, 2)},
        "estimated_impact": {
            "absolute": round(impact_abs, 2),
            "percent": round(impact_pct, 2) if impact_pct is not None else None,
        },
        "model": {
            "type": "Linear Regression",
            "r_squared": round(float(r2), 3),
            "coefficient": round(float(model.coef_[0]), 4),
            "intercept": round(float(model.intercept_), 4),
            "n_observations": int(len(agg)),
        },
        "confidence": confidence,
        "assumptions": [
            f"Assumes a linear relationship between {driver_column.replace('_',' ')} and {target_metric.replace('_',' ')}.",
            "Holds all other factors constant (ceteris paribus) — real-world outcomes may differ.",
            "This is an observed statistical association from historical data, not a proven causal effect.",
        ],
        "disclaimer": "This is a model-based estimate only, derived from historical correlation. It should not be treated as a guaranteed outcome.",
    }
