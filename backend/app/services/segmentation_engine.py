"""
Customer/Product/Business Segmentation via K-Means clustering.
"""
from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score


def run_segmentation(df: pd.DataFrame, schema_map: Dict[str, Any],
                      entity_column: Optional[str] = None,
                      feature_columns: Optional[List[str]] = None,
                      n_clusters: Optional[int] = None) -> Dict[str, Any]:
    numeric_cols = [c for c in schema_map.get("numeric_columns", []) if c in df.columns]
    dims = [d for d in schema_map.get("likely_dimensions", []) if d in df.columns]

    entity_column = entity_column or (dims[0] if dims else None)
    if not entity_column or entity_column not in df.columns:
        raise ValueError("No suitable entity column (e.g. customer, product) found for segmentation.")

    feature_columns = [c for c in (feature_columns or numeric_cols) if c in df.columns]
    if len(feature_columns) < 1:
        raise ValueError("Dataset does not contain enough numeric features for meaningful segmentation.")

    agg = df.groupby(entity_column)[feature_columns].agg(["sum", "mean", "count"])
    agg.columns = ["_".join(c) for c in agg.columns]
    agg = agg.reset_index()

    feature_matrix_cols = [c for c in agg.columns if c != entity_column]
    if len(agg) < 6:
        raise ValueError(
            f"Only {len(agg)} unique '{entity_column}' values found — need at least 6 for meaningful clustering."
        )

    X = agg[feature_matrix_cols].fillna(0)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    k = n_clusters
    best_score = -1
    if k is None:
        k_range = range(2, min(7, len(agg)))
        best_k, best_score = 2, -1
        for candidate_k in k_range:
            model = KMeans(n_clusters=candidate_k, random_state=42, n_init=10)
            labels = model.fit_predict(X_scaled)
            if len(set(labels)) < 2:
                continue
            score = silhouette_score(X_scaled, labels)
            if score > best_score:
                best_k, best_score = candidate_k, score
        k = best_k
    else:
        model_tmp = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels_tmp = model_tmp.fit_predict(X_scaled)
        best_score = silhouette_score(X_scaled, labels_tmp) if len(set(labels_tmp)) > 1 else 0.0

    model = KMeans(n_clusters=k, random_state=42, n_init=10)
    agg["cluster"] = model.fit_predict(X_scaled)

    cluster_profiles = []
    overall_mean = agg[feature_matrix_cols].mean()
    for cluster_id in sorted(agg["cluster"].unique()):
        subset = agg[agg["cluster"] == cluster_id]
        cluster_mean = subset[feature_matrix_cols].mean()
        relative = ((cluster_mean - overall_mean) / overall_mean.replace(0, np.nan)).fillna(0)

        top_feature = relative.abs().idxmax() if not relative.empty else None
        label = _describe_cluster(top_feature, relative.get(top_feature, 0)) if top_feature else f"Segment {cluster_id + 1}"

        cluster_profiles.append({
            "cluster_id": int(cluster_id),
            "label": label,
            "size": int(len(subset)),
            "pct_of_total": round(len(subset) / len(agg) * 100, 1),
            "profile": {k2: round(float(v), 2) for k2, v in cluster_mean.items()},
            "sample_entities": subset[entity_column].astype(str).head(5).tolist(),
        })

    scatter_data = []
    if len(feature_matrix_cols) >= 2:
        for _, row in agg.iterrows():
            scatter_data.append({
                "entity": str(row[entity_column]),
                "x": float(row[feature_matrix_cols[0]]),
                "y": float(row[feature_matrix_cols[1]]),
                "cluster": int(row["cluster"]),
            })

    return {
        "entity_column": entity_column,
        "feature_columns_used": feature_matrix_cols,
        "n_clusters": int(k),
        "silhouette_score": round(float(best_score), 3),
        "cluster_profiles": cluster_profiles,
        "scatter_data": scatter_data,
        "method": "K-Means clustering on standardized aggregated features, k selected via silhouette score.",
    }


def _describe_cluster(top_feature: Optional[str], relative_diff: float) -> str:
    if not top_feature:
        return "General Segment"
    direction = "High" if relative_diff > 0 else "Low"
    feature_label = top_feature.replace("_sum", "").replace("_mean", "").replace("_count", "").replace("_", " ")
    intensity = "Very " if abs(relative_diff) > 0.75 else ""
    return f"{intensity}{direction} {feature_label.title()} Segment"
