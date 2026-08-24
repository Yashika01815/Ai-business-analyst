"""
Forecasting Studio engine.
Automatically chooses between Holt-Winters exponential smoothing (when
enough history exists to estimate trend/seasonality) and simple linear
regression (as a robust fallback for short series). Reports MAE/RMSE/MAPE
computed via a holdout split of real historical data.
"""
from typing import Any, Dict, Optional
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error


def _infer_frequency(dates: pd.Series) -> str:
    span_days = (dates.max() - dates.min()).days
    n = dates.nunique()
    if span_days <= 0:
        return "D"
    avg_gap = span_days / max(n - 1, 1)
    if avg_gap <= 2:
        return "D"
    elif avg_gap <= 10:
        return "W"
    else:
        return "M"


def _aggregate_series(df: pd.DataFrame, date_col: str, metric: str, freq: str) -> pd.Series:
    ts = df[[date_col, metric]].dropna().copy()
    ts = ts.set_index(date_col).sort_index()
    resampled = ts[metric].resample(freq).sum()
    return resampled


def run_forecast(df: pd.DataFrame, date_col: str, metric: str, horizon: int,
                  frequency: Optional[str] = None) -> Dict[str, Any]:
    if date_col not in df.columns or metric not in df.columns:
        raise ValueError("Selected date or metric column not found in dataset.")

    freq = frequency or _infer_frequency(df[date_col].dropna())
    series = _aggregate_series(df, date_col, metric, freq)
    series = series.replace(0, np.nan).interpolate().fillna(0)

    if len(series) < 6:
        raise ValueError(
            f"Not enough historical periods ({len(series)}) at frequency '{freq}' to produce a reliable forecast. "
            f"At least 6 periods are required."
        )

    method_used = "none"
    predictions = None
    lower_ci = None
    upper_ci = None
    eval_metrics = {}

    # Holdout evaluation split (last 20%, min 2 points)
    split = max(len(series) - max(2, int(len(series) * 0.2)), 3)
    train, test = series.iloc[:split], series.iloc[split:]

    try:
        if len(series) >= 12:
            from statsmodels.tsa.holtwinters import ExponentialSmoothing
            seasonal_periods = 12 if freq == "M" else (7 if freq == "D" else 4)
            use_seasonal = len(train) >= 2 * seasonal_periods
            model = ExponentialSmoothing(
                train, trend="add",
                seasonal="add" if use_seasonal else None,
                seasonal_periods=seasonal_periods if use_seasonal else None,
                initialization_method="estimated",
            ).fit(optimized=True)
            test_pred = model.forecast(len(test)) if len(test) > 0 else pd.Series(dtype=float)
            if len(test) > 0:
                eval_metrics = {
                    "mae": float(mean_absolute_error(test, test_pred)),
                    "rmse": float(np.sqrt(mean_squared_error(test, test_pred))),
                    "mape": float(np.mean(np.abs((test - test_pred) / test.replace(0, np.nan))) * 100) if (test != 0).any() else None,
                }
            final_model = ExponentialSmoothing(
                series, trend="add",
                seasonal="add" if use_seasonal else None,
                seasonal_periods=seasonal_periods if use_seasonal else None,
                initialization_method="estimated",
            ).fit(optimized=True)
            predictions = final_model.forecast(horizon)
            resid_std = float(np.std(final_model.resid)) if hasattr(final_model, "resid") else float(series.std() * 0.1)
            lower_ci = predictions - 1.96 * resid_std
            upper_ci = predictions + 1.96 * resid_std
            method_used = "Holt-Winters Exponential Smoothing" + (" (with seasonality)" if use_seasonal else " (trend only)")
    except Exception:
        predictions = None

    if predictions is None:
        # Fallback: linear regression on time index
        x_train = np.arange(len(train)).reshape(-1, 1)
        reg = LinearRegression().fit(x_train, train.values)
        if len(test) > 0:
            x_test = np.arange(len(train), len(train) + len(test)).reshape(-1, 1)
            test_pred = reg.predict(x_test)
            eval_metrics = {
                "mae": float(mean_absolute_error(test, test_pred)),
                "rmse": float(np.sqrt(mean_squared_error(test, test_pred))),
                "mape": float(np.mean(np.abs((test.values - test_pred) / np.where(test.values == 0, np.nan, test.values))) * 100),
            }
        x_full = np.arange(len(series)).reshape(-1, 1)
        reg_full = LinearRegression().fit(x_full, series.values)
        x_future = np.arange(len(series), len(series) + horizon).reshape(-1, 1)
        preds_array = reg_full.predict(x_future)
        resid = series.values - reg_full.predict(x_full)
        resid_std = float(np.std(resid))
        predictions = pd.Series(preds_array)
        lower_ci = predictions - 1.96 * resid_std
        upper_ci = predictions + 1.96 * resid_std
        method_used = "Linear Regression (trend extrapolation)"

    future_index = pd.date_range(series.index.max(), periods=horizon + 1, freq=freq)[1:]

    historical = [{"period": str(idx.date() if hasattr(idx, "date") else idx), "value": float(v)}
                  for idx, v in series.items()]
    forecast = [{"period": str(idx.date() if hasattr(idx, "date") else idx),
                 "value": float(max(p, 0)),
                 "lower": float(max(l, 0)), "upper": float(max(u, 0))}
                for idx, p, l, u in zip(future_index, predictions.values if hasattr(predictions, "values") else predictions,
                                         lower_ci.values if hasattr(lower_ci, "values") else lower_ci,
                                         upper_ci.values if hasattr(upper_ci, "values") else upper_ci)]

    return {
        "method": method_used,
        "frequency": freq,
        "horizon": horizon,
        "historical": historical,
        "forecast": forecast,
        "evaluation_metrics": eval_metrics,
        "assumptions": [
            "Forecast assumes historical patterns (trend/seasonality) continue unchanged.",
            "Does not account for unforeseen events, marketing changes, or external shocks.",
            f"Aggregated to {freq}-level periods from raw transaction data.",
        ],
        "limitations": [
            "Confidence intervals are approximate, based on residual standard deviation.",
            "Accuracy decreases the further into the future the forecast extends.",
        ],
    }
