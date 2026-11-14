"""
Ask Your Data orchestration layer.

Groq's ONLY job is to (1) decide which verified backend tool answers the
user's question and with what arguments, and (2) explain the tool's real
output in plain English. Groq never invents numbers itself — every
figure shown to the user comes from the SQL/Pandas/sklearn tool execution
below, which is the single source of truth.
"""
import json
import re
from typing import Any, Dict, List, Optional

import pandas as pd
from sqlalchemy.engine import Engine

from app.services import analytics
from app.services.groq_client import is_available, generate_text
from app.utils.logger import get_logger

logger = get_logger(__name__)

ALLOWED_SQL_PATTERN = re.compile(r"^\s*SELECT\b", re.IGNORECASE)


# ---------------------------------------------------------------------------
# Tool implementations (real, verified computation)
# ---------------------------------------------------------------------------

def tool_run_sql(engine: Engine, table_name: str, sql: str) -> Dict[str, Any]:
    if not ALLOWED_SQL_PATTERN.match(sql):
        raise ValueError("Only SELECT queries are permitted.")
    if any(kw in sql.lower() for kw in ["drop ", "delete ", "update ", "insert ", "alter ", ";--", "attach "]):
        raise ValueError("Query contains disallowed keywords.")
    df = analytics.run_sql(engine, sql)
    df = df.head(200)
    return {"columns": list(df.columns), "rows": df.where(pd.notna(df), None).to_dict(orient="records")}


def tool_aggregate(df: pd.DataFrame, dimension: str, metric: str, agg: str = "sum",
                    top_n: int = 10, ascending: bool = False) -> Dict[str, Any]:
    if dimension not in df.columns or metric not in df.columns:
        raise ValueError(f"Column not found: {dimension if dimension not in df.columns else metric}")
    grouped = df.groupby(dimension)[metric].agg(agg).reset_index()
    grouped = grouped.sort_values(metric, ascending=ascending).head(top_n)
    return {"dimension": dimension, "metric": metric, "aggregation": agg,
            "order": "ascending" if ascending else "descending",
            "data": grouped.to_dict(orient="records")}


def tool_describe_metric(df: pd.DataFrame, metric: str) -> Dict[str, Any]:
    if metric not in df.columns:
        raise ValueError(f"Column '{metric}' not found.")
    series = df[metric].dropna()
    return {
        "metric": metric, "sum": float(series.sum()), "mean": float(series.mean()),
        "median": float(series.median()), "min": float(series.min()), "max": float(series.max()),
        "count": int(series.count()),
    }


TOOL_SCHEMA_DESCRIPTION = """
Available tools:
1. run_sql(sql: str) — Execute a read-only SELECT SQL query against the dataset table.
2. aggregate(dimension: str, metric: str, agg: str, top_n: int, ascending: bool) — Group by a dimension and aggregate a metric.
3. describe_metric(metric: str) — Get summary statistics (sum, mean, median, min, max) for a numeric column.
"""


def _build_planning_prompt(question: str, table_name: str, columns_info: List[Dict[str, Any]]) -> str:
    cols_desc = "\n".join(
        f"- {c['name']} ({c['dtype']}, role={c['role']})" for c in columns_info
    )
    return f"""You are a data analysis planner. A user asked a question about a business dataset.
Decide which ONE tool below best answers it, and respond with ONLY a JSON object — no markdown, no prose.

{TOOL_SCHEMA_DESCRIPTION}

Dataset SQL table name: {table_name}
Columns:
{cols_desc}

User question: "{question}"

Respond with strict JSON in this exact shape:
{{"tool": "run_sql" | "aggregate" | "describe_metric", "args": {{...}}, "reasoning": "one sentence"}}

If using run_sql, write a single valid SELECT statement against table "{table_name}" using the exact column names above.
If using aggregate, "agg" must be one of: sum, mean, count, max, min.
"""


def _extract_json(text: str) -> Dict[str, Any]:
    text = text.strip()
    text = re.sub(r"^```json\s*|\s*```$", "", text, flags=re.MULTILINE).strip()
    text = re.sub(r"^```\s*|\s*```$", "", text, flags=re.MULTILINE).strip()
    return json.loads(text)


_TOP_WORDS = ["top", "highest", "most", "best", "largest", "biggest", "leading", "greatest", "max", "maximum"]
_BOTTOM_WORDS = ["lowest", "worst", "least", "smallest", "bottom", "min", "minimum"]
_BREAKDOWN_WORDS = [" by ", " per ", "compare", "comparison", "breakdown", "each ", "across", "split"]
_DESCRIBE_WORDS = ["total", "sum", "overall", "average", "mean", "how much", "what is the", "what's the", "grand total"]
_TOP_N_PATTERN = re.compile(r"\btop\s+(\d+)\b")
_WORD_TO_NUM = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10}


def _find_column_mention(q: str, columns: List[str]) -> Optional[str]:
    """Find the column whose name (or individual word tokens) is most
    specifically mentioned in the question. Prefers full-phrase matches
    over single-token matches so questions naming a specific column are
    never confused with the default/first column."""
    q_words = re.findall(r"[a-z0-9]+", q)
    best_col, best_score = None, 0
    for col in columns:
        label = col.replace("_", " ")
        tokens = [t for t in label.split() if len(t) > 2]
        if not tokens:
            continue
        if label in q:
            score = len(tokens) * 10  # full phrase match wins outright
        else:
            score = sum(1 for t in tokens if t in q_words)
        if score > best_score:
            best_score, best_col = score, col
    return best_col


def _detect_intent(q: str) -> str:
    if any(w in q for w in _TOP_WORDS):
        return "top"
    if any(w in q for w in _BOTTOM_WORDS):
        return "bottom"
    if any(w in q for w in _BREAKDOWN_WORDS):
        return "breakdown"
    if any(w in q for w in _DESCRIBE_WORDS):
        return "describe"
    return "unknown"


def _detect_top_n(q: str) -> int:
    m = _TOP_N_PATTERN.search(q)
    if m:
        return max(1, min(int(m.group(1)), 50))
    for word, num in _WORD_TO_NUM.items():
        if f"top {word}" in q:
            return num
    return 10


def _fallback_plan(question: str, schema_map: Dict[str, Any]) -> Dict[str, Any]:
    """Heuristic fallback used when Groq is unavailable, so the feature
    still works (with reduced flexibility) without an API key. Uses the
    actual wording of each question — which metric/dimension is named and
    whether it's asking for a total, a ranking, or a breakdown — rather
    than always defaulting to the first metric/dimension in the dataset."""
    metrics = schema_map.get("likely_metrics", []) or schema_map.get("numeric_columns", [])
    all_numeric = schema_map.get("numeric_columns", [])
    dims = schema_map.get("likely_dimensions", [])
    q = question.lower()

    metric = _find_column_mention(q, metrics) or _find_column_mention(q, all_numeric) or (metrics[0] if metrics else None)
    dim = _find_column_mention(q, dims)
    intent = _detect_intent(q)

    if not metric:
        return {"tool": "describe_metric",
                "args": {"metric": metrics[0] if metrics else (all_numeric[0] if all_numeric else "value")},
                "reasoning": "Heuristic fallback: no specific metric recognized, showing the primary metric (no Groq API key configured)."}

    # A plain "what is the total X" with no dimension or ranking language -> describe_metric.
    if intent == "describe" and not dim:
        return {"tool": "describe_metric", "args": {"metric": metric},
                "reasoning": "Heuristic fallback: detected a totals/summary question (no Groq API key configured)."}

    # Ranking or breakdown language, or a dimension was explicitly named -> aggregate.
    if intent in ("top", "bottom", "breakdown") or dim:
        chosen_dim = dim or (dims[0] if dims else None)
        if not chosen_dim:
            return {"tool": "describe_metric", "args": {"metric": metric},
                    "reasoning": "Heuristic fallback: no dimension available to break down by (no Groq API key configured)."}
        return {"tool": "aggregate",
                "args": {"dimension": chosen_dim, "metric": metric, "agg": "sum",
                          "top_n": _detect_top_n(q), "ascending": intent == "bottom"},
                "reasoning": f"Heuristic fallback: detected a '{intent}' question about {metric} by {chosen_dim} (no Groq API key configured)."}

    # Default: no clear ranking/breakdown/total signal — summarize the metric.
    return {"tool": "describe_metric", "args": {"metric": metric},
            "reasoning": "Heuristic fallback: defaulting to a summary of the recognized metric (no Groq API key configured)."}


def answer_question(engine: Engine, df: pd.DataFrame, table_name: str,
                     profile: Dict[str, Any], schema_map: Dict[str, Any],
                     question: str) -> Dict[str, Any]:
    columns_info = profile.get("columns", [])

    plan = None
    if is_available():
        try:
            prompt = _build_planning_prompt(question, table_name, columns_info)
            raw = generate_text(prompt, temperature=0.1)
            plan = _extract_json(raw)
        except Exception as e:
            logger.warning(f"Groq planning failed, using fallback: {e}")
            plan = None

    if not plan or "tool" not in plan:
        plan = _fallback_plan(question, schema_map)

    tool = plan.get("tool")
    args = plan.get("args", {})

    try:
        if tool == "run_sql":
            result = tool_run_sql(engine, table_name, args.get("sql", ""))
            how = {"method": "SQL Query", "sql": args.get("sql")}
        elif tool == "aggregate":
            result = tool_aggregate(
                df, args.get("dimension"), args.get("metric"),
                args.get("agg", "sum"), int(args.get("top_n", 10)), bool(args.get("ascending", False)),
            )
            how = {"method": "Pandas group-by aggregation", "dimension": args.get("dimension"),
                   "metric": args.get("metric"), "aggregation": args.get("agg", "sum")}
        elif tool == "describe_metric":
            result = tool_describe_metric(df, args.get("metric"))
            how = {"method": "Descriptive statistics", "metric": args.get("metric")}
        else:
            raise ValueError(f"Unknown tool selected: {tool}")
    except Exception as e:
        return {
            "answer": f"I couldn't compute an answer: {e}. Try rephrasing your question or check the column names in Data Quality Center.",
            "tool_used": tool or "none",
            "how_calculated": {"error": str(e), "plan": plan},
            "chart": None, "data": None,
        }

    explanation_prompt = f"""You are a business analyst. A user asked: "{question}"
The following VERIFIED data was computed by the backend (SQL/Pandas — this is ground truth, not your own calculation):
{json.dumps(result, default=str)[:4000]}

Write a concise (2-4 sentence), plain-English answer using ONLY the numbers in this data. Do not invent or recalculate any numbers.
If the data doesn't fully answer the question, say so honestly."""
    answer_text = generate_text(explanation_prompt, temperature=0.3) if is_available() else _plain_explanation(result, tool)

    chart = None
    if tool == "aggregate" and isinstance(result.get("data"), list) and len(result["data"]) > 0:
        chart = {"type": "bar", "title": f"{args.get('metric')} by {args.get('dimension')}",
                 "x_key": args.get("dimension"), "y_key": args.get("metric"), "data": result["data"]}

    return {
        "answer": answer_text,
        "tool_used": tool,
        "how_calculated": {**how, "planner_reasoning": plan.get("reasoning")},
        "chart": chart,
        "data": result,
    }


def _plain_explanation(result: Dict[str, Any], tool: str) -> str:
    """Deterministic explanation used when Groq is not configured."""
    if tool == "describe_metric":
        return (f"Total {result['metric'].replace('_',' ')}: {result['sum']:,.2f}. "
                f"Average: {result['mean']:,.2f}. Range: {result['min']:,.2f} to {result['max']:,.2f} "
                f"across {result['count']} records.")
    if tool == "aggregate" and result.get("data"):
        top = result["data"][0]
        order = result.get("order", "descending")
        label = "lowest" if order == "ascending" else "highest"
        return (f"The {label} result by {result['metric'].replace('_',' ')} ({result['aggregation']}) is "
                f"'{top.get(result['dimension'])}' with {top.get(result['metric']):,.2f}. "
                f"{len(result['data'])} group(s) shown, ranked {order}.")
    if tool == "run_sql" and result.get("rows"):
        return f"Query returned {len(result['rows'])} row(s). See the table below for details."
    return "See the computed data below."
