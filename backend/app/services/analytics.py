"""
Core analytics engine. All numbers shown to the user originate here via
real SQL/Pandas computation against the materialized dataset table —
never from the LLM.
"""
from typing import Any, Dict, List, Optional
import pandas as pd
from sqlalchemy import text
from sqlalchemy.engine import Engine

from app.utils.logger import get_logger

logger = get_logger(__name__)


def load_dataset_df(engine: Engine, table_name: str) -> pd.DataFrame:
    df = pd.read_sql_table(table_name, con=engine)
    for col in df.columns:
        if df[col].dtype == "object":
            try:
                parsed = pd.to_datetime(df[col], errors="coerce", format="mixed")
                if parsed.notna().mean() > 0.8:
                    df[col] = parsed
            except Exception:
                pass
    return df


def run_sql(engine: Engine, sql: str, params: Optional[Dict[str, Any]] = None) -> pd.DataFrame:
    """Execute a read-only SQL query against a dataset table. Used both by
    the API layer and by the Groq-orchestrated Ask Your Data tool."""
    with engine.connect() as conn:
        return pd.read_sql_query(text(sql), conn, params=params or {})


def compute_kpis(df: pd.DataFrame, schema_map: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Dynamically compute KPI cards based on detected metrics — never
    hardcoded to a fixed schema."""
    kpis: List[Dict[str, Any]] = []
    metrics = schema_map.get("likely_metrics", [])
    date_col = schema_map.get("primary_date_column")

    def trend(col: str) -> Optional[float]:
        if not date_col or date_col not in df.columns:
            return None
        d = df[[date_col, col]].dropna().sort_values(date_col)
        if len(d) < 4:
            return None
        mid = len(d) // 2
        first_half = d[col].iloc[:mid].sum()
        second_half = d[col].iloc[mid:].sum()
        if first_half == 0:
            return None
        return round(((second_half - first_half) / abs(first_half)) * 100, 2)

    for m in metrics:
        if m not in df.columns:
            continue
        series = df[m].dropna()
        if series.empty:
            continue
        kpis.append({
            "label": m.replace("_", " ").title(),
            "metric_key": m,
            "total": round(float(series.sum()), 2),
            "average": round(float(series.mean()), 2),
            "min": round(float(series.min()), 2),
            "max": round(float(series.max()), 2),
            "trend_pct": trend(m),
        })

    # Generic row-count based KPIs
    kpis.append({
        "label": "Total Records",
        "metric_key": "__row_count__",
        "total": int(len(df)),
        "average": None, "min": None, "max": None, "trend_pct": None,
    })

    dims = schema_map.get("likely_dimensions", [])
    if dims:
        first_dim = dims[0]
        if first_dim in df.columns:
            kpis.append({
                "label": f"Unique {first_dim.replace('_', ' ').title()}",
                "metric_key": f"__unique_{first_dim}__",
                "total": int(df[first_dim].nunique()),
                "average": None, "min": None, "max": None, "trend_pct": None,
            })

    return kpis


def suggest_charts(df: pd.DataFrame, schema_map: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Automatically select useful chart types based on the dataset shape."""
    charts: List[Dict[str, Any]] = []
    date_col = schema_map.get("primary_date_column")
    metrics = schema_map.get("likely_metrics", [])
    dims = schema_map.get("likely_dimensions", [])

    # Time series line chart(s)
    if date_col and date_col in df.columns and metrics:
        for m in metrics[:2]:
            if m not in df.columns:
                continue
            ts = df[[date_col, m]].dropna().copy()
            if ts.empty:
                continue
            ts["_period"] = ts[date_col].dt.to_period("M").astype(str)
            grouped = ts.groupby("_period")[m].sum().reset_index().sort_values("_period")
            charts.append({
                "type": "line",
                "title": f"{m.replace('_', ' ').title()} Over Time",
                "x_key": "_period",
                "y_key": m,
                "data": grouped.to_dict(orient="records"),
            })

    # Bar chart: metric by dimension (ranking)
    if dims and metrics:
        dim, metric = dims[0], metrics[0]
        if dim in df.columns and metric in df.columns:
            grouped = df.groupby(dim)[metric].sum().reset_index().sort_values(metric, ascending=False).head(10)
            charts.append({
                "type": "bar",
                "title": f"{metric.replace('_', ' ').title()} by {dim.replace('_', ' ').title()}",
                "x_key": dim,
                "y_key": metric,
                "data": grouped.to_dict(orient="records"),
            })

    # Donut chart: share of a dimension (only if cardinality is small, meaningful part-to-whole)
    if dims and metrics:
        dim, metric = dims[0], metrics[0]
        if dim in df.columns and metric in df.columns:
            nunique = df[dim].nunique()
            if 2 <= nunique <= 8:
                grouped = df.groupby(dim)[metric].sum().reset_index()
                charts.append({
                    "type": "donut",
                    "title": f"Share of {metric.replace('_', ' ').title()} by {dim.replace('_', ' ').title()}",
                    "x_key": dim,
                    "y_key": metric,
                    "data": grouped.to_dict(orient="records"),
                })

    # Scatter: relationship between two numeric metrics
    numeric_cols = schema_map.get("numeric_columns", [])
    if len(numeric_cols) >= 2:
        a, b = numeric_cols[0], numeric_cols[1]
        if a in df.columns and b in df.columns:
            sample = df[[a, b]].dropna().sample(min(300, len(df))) if len(df) > 0 else df[[a, b]]
            charts.append({
                "type": "scatter",
                "title": f"{a.replace('_', ' ').title()} vs {b.replace('_', ' ').title()}",
                "x_key": a,
                "y_key": b,
                "data": sample.to_dict(orient="records"),
            })

    # Second dimension ranking as a table-friendly bar
    if len(dims) >= 2 and metrics:
        dim, metric = dims[1], metrics[0]
        if dim in df.columns and metric in df.columns:
            grouped = df.groupby(dim)[metric].sum().reset_index().sort_values(metric, ascending=False).head(10)
            charts.append({
                "type": "bar",
                "title": f"{metric.replace('_', ' ').title()} by {dim.replace('_', ' ').title()}",
                "x_key": dim,
                "y_key": metric,
                "data": grouped.to_dict(orient="records"),
            })

    return charts


def get_filter_options(df: pd.DataFrame, schema_map: Dict[str, Any]) -> Dict[str, List[Any]]:
    options = {}
    for dim in schema_map.get("likely_dimensions", []):
        if dim in df.columns and df[dim].nunique() <= 50:
            options[dim] = sorted([str(v) for v in df[dim].dropna().unique().tolist()])
    date_col = schema_map.get("primary_date_column")
    if date_col and date_col in df.columns:
        valid_dates = df[date_col].dropna()
        if not valid_dates.empty:
            options["_date_range"] = [valid_dates.min().strftime("%Y-%m-%d"), valid_dates.max().strftime("%Y-%m-%d")]
    return options
