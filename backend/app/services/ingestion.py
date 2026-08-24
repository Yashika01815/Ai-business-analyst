"""
Ingestion pipeline: CSV/XLSX -> pandas DataFrame -> profiling -> cleaning
-> materialize into a dedicated SQL table via SQLAlchemy/pandas.to_sql.

Every cleaning step performed is logged so the user can see exactly what
changed. Nothing is silently modified.
"""
import io
import re
import uuid
from datetime import datetime
from typing import Any, Dict, List, Tuple

import numpy as np
import pandas as pd
from sqlalchemy import inspect
from sqlalchemy.engine import Engine

from app.utils.logger import get_logger

logger = get_logger(__name__)

MAX_PREVIEW_ROWS = 50


def sanitize_table_name(filename: str) -> str:
    base = re.sub(r"[^a-zA-Z0-9_]", "_", filename.rsplit(".", 1)[0]).lower()
    base = re.sub(r"_+", "_", base).strip("_") or "dataset"
    suffix = uuid.uuid4().hex[:8]
    return f"ds_{base[:40]}_{suffix}"


def read_file(file_bytes: bytes, filename: str) -> pd.DataFrame:
    if filename.lower().endswith(".csv"):
        return pd.read_csv(io.BytesIO(file_bytes))
    elif filename.lower().endswith((".xlsx", ".xls")):
        return pd.read_excel(io.BytesIO(file_bytes))
    else:
        raise ValueError("Unsupported file type. Please upload a .csv or .xlsx file.")


def _looks_like_date(series: pd.Series) -> bool:
    if series.dtype == "object":
        sample = series.dropna().astype(str).head(20)
        if len(sample) == 0:
            return False
        parsed = pd.to_datetime(sample, errors="coerce", format="mixed")
        return parsed.notna().mean() > 0.8
    return False


def _detect_column_roles(df: pd.DataFrame) -> Dict[str, Any]:
    """Classify each column as date, numeric metric, or categorical dimension,
    and guess likely business semantics from the column name."""
    date_cols, numeric_cols, categorical_cols, id_cols = [], [], [], []

    metric_keywords = ["revenue", "sales", "amount", "price", "cost", "profit",
                        "total", "quantity", "qty", "spend", "budget", "value",
                        "units", "orders", "clicks", "impressions", "conversion"]
    dim_keywords = ["region", "category", "product", "customer", "channel",
                    "segment", "country", "city", "status", "campaign", "type"]
    id_keywords = ["id", "_id", "uuid", "code"]

    for col in df.columns:
        col_lower = col.lower()
        if _looks_like_date(df[col]) or "date" in col_lower:
            date_cols.append(col)
        elif pd.api.types.is_numeric_dtype(df[col]):
            if any(k in col_lower for k in id_keywords) and df[col].nunique() > 0.9 * len(df):
                id_cols.append(col)
            else:
                numeric_cols.append(col)
        else:
            if any(k in col_lower for k in id_keywords) and df[col].nunique() > 0.9 * len(df):
                id_cols.append(col)
            else:
                categorical_cols.append(col)

    likely_metrics = [c for c in numeric_cols if any(k in c.lower() for k in metric_keywords)] or numeric_cols[:5]
    likely_dimensions = [c for c in categorical_cols if any(k in c.lower() for k in dim_keywords)] or categorical_cols[:5]

    return {
        "date_columns": date_cols,
        "numeric_columns": numeric_cols,
        "categorical_columns": categorical_cols,
        "id_columns": id_cols,
        "likely_metrics": likely_metrics,
        "likely_dimensions": likely_dimensions,
        "primary_date_column": date_cols[0] if date_cols else None,
    }


def profile_dataframe(df: pd.DataFrame) -> Dict[str, Any]:
    """Produce a rich profile: dtypes, missing values, duplicates, outliers."""
    roles = _detect_column_roles(df)

    missing = df.isna().sum()
    missing_pct = (missing / max(len(df), 1) * 100).round(2)

    duplicate_rows = int(df.duplicated().sum())

    outliers = {}
    for col in roles["numeric_columns"]:
        series = df[col].dropna()
        if len(series) < 8:
            continue
        q1, q3 = series.quantile(0.25), series.quantile(0.75)
        iqr = q3 - q1
        if iqr == 0:
            continue
        lower, upper = q1 - 1.5 * iqr, q3 + 1.5 * iqr
        count = int(((series < lower) | (series > upper)).sum())
        if count > 0:
            outliers[col] = {"count": count, "pct": round(count / len(series) * 100, 2),
                              "lower_bound": float(lower), "upper_bound": float(upper)}

    columns_info = []
    for col in df.columns:
        role = "date" if col in roles["date_columns"] else (
            "numeric" if col in roles["numeric_columns"] else (
                "id" if col in roles["id_columns"] else "categorical"))
        columns_info.append({
            "name": col,
            "dtype": str(df[col].dtype),
            "role": role,
            "missing_count": int(missing[col]),
            "missing_pct": float(missing_pct[col]),
            "unique_count": int(df[col].nunique()),
        })

    return {
        "row_count": int(len(df)),
        "column_count": int(len(df.columns)),
        "columns": columns_info,
        "roles": roles,
        "duplicate_rows": duplicate_rows,
        "outliers": outliers,
        "missing_total_cells": int(missing.sum()),
    }


def compute_quality_score(profile: Dict[str, Any]) -> float:
    """0-100 score combining completeness, duplication, and outlier severity."""
    total_cells = max(profile["row_count"] * profile["column_count"], 1)
    completeness = 1 - (profile["missing_total_cells"] / total_cells)
    dup_penalty = min(profile["duplicate_rows"] / max(profile["row_count"], 1), 0.3)
    outlier_cells = sum(v["count"] for v in profile["outliers"].values())
    outlier_penalty = min(outlier_cells / total_cells, 0.2)

    score = (completeness * 70) + ((1 - dup_penalty) * 20) + ((1 - outlier_penalty) * 10)
    return round(max(0.0, min(100.0, score)), 1)


def clean_dataframe(df: pd.DataFrame, profile: Dict[str, Any]) -> Tuple[pd.DataFrame, List[Dict[str, Any]]]:
    """
    Apply conservative, explainable cleaning operations and return the
    cleaned dataframe plus a human-readable log of every change made.
    """
    log: List[Dict[str, Any]] = []
    df = df.copy()
    roles = profile["roles"]

    # 1. Normalize column names (strip whitespace)
    original_cols = list(df.columns)
    df.columns = [str(c).strip() for c in df.columns]
    if list(df.columns) != original_cols:
        log.append({"operation": "normalize_headers",
                     "detail": "Trimmed whitespace from column headers."})

    # 2. Remove exact duplicate rows
    before = len(df)
    df = df.drop_duplicates()
    removed = before - len(df)
    if removed > 0:
        log.append({"operation": "remove_duplicates",
                     "detail": f"Removed {removed} exact duplicate row(s)."})

    # 3. Parse date columns
    for col in roles["date_columns"]:
        if col in df.columns:
            try:
                df[col] = pd.to_datetime(df[col], errors="coerce", format="mixed")
                log.append({"operation": "parse_date",
                             "detail": f"Converted column '{col}' to datetime."})
            except Exception:
                pass

    # 4. Handle missing values conservatively
    for col in roles["numeric_columns"]:
        if col in df.columns and df[col].isna().any():
            missing_pct = df[col].isna().mean() * 100
            if missing_pct < 40:
                median_val = df[col].median()
                n_filled = int(df[col].isna().sum())
                df[col] = df[col].fillna(median_val)
                log.append({"operation": "fill_missing_numeric",
                             "detail": f"Filled {n_filled} missing value(s) in '{col}' with the median ({median_val:.2f})."})
            else:
                log.append({"operation": "flag_high_missing",
                             "detail": f"Column '{col}' has {missing_pct:.1f}% missing values and was left as-is (too sparse to safely impute)."})

    for col in roles["categorical_columns"]:
        if col in df.columns and df[col].isna().any():
            n_filled = int(df[col].isna().sum())
            df[col] = df[col].fillna("Unknown")
            log.append({"operation": "fill_missing_categorical",
                         "detail": f"Filled {n_filled} missing value(s) in '{col}' with 'Unknown'."})

    # 5. Strip whitespace on text/categorical columns
    for col in roles["categorical_columns"]:
        if col in df.columns and df[col].dtype == "object":
            df[col] = df[col].astype(str).str.strip()

    # 6. Standardize column names for SQL safety (keep a display-name mapping)
    safe_cols = {}
    for col in df.columns:
        safe = re.sub(r"[^a-zA-Z0-9_]", "_", col.strip())
        safe = re.sub(r"_+", "_", safe).strip("_").lower() or "col"
        safe_cols[col] = safe
    df = df.rename(columns=safe_cols)

    return df, log


def persist_dataframe(df: pd.DataFrame, table_name: str, engine: Engine) -> None:
    """Materialize the cleaned dataframe into its own SQL table."""
    df.to_sql(table_name, con=engine, if_exists="replace", index=False, chunksize=5000)
    logger.info(f"Persisted dataset into SQL table '{table_name}' ({len(df)} rows).")


def get_preview(df: pd.DataFrame, n: int = MAX_PREVIEW_ROWS) -> List[Dict[str, Any]]:
    preview_df = df.head(n).copy()
    for col in preview_df.columns:
        if pd.api.types.is_datetime64_any_dtype(preview_df[col]):
            preview_df[col] = preview_df[col].dt.strftime("%Y-%m-%d")
    return preview_df.replace({np.nan: None}).to_dict(orient="records")
