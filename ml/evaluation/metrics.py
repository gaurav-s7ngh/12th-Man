from typing import Any, Dict
import numpy as np
from sklearn.metrics import silhouette_score


def evaluate_clustering(X: np.ndarray, labels: np.ndarray) -> Dict[str, Any]:
    """Calculates cluster quality metrics: silhouette score and sample count."""
    if len(np.unique(labels)) < 2:
        return {"silhouette_score": 0.0, "status": "Insufficient clusters"}

    score = float(silhouette_score(X, labels))
    return {
        "silhouette_score": round(score, 3),
        "cluster_count": len(np.unique(labels)),
        "samples_evaluated": len(X),
        "quality": "Robust" if score > 0.25 else "Moderate" if score > 0.1 else "Diffuse",
    }
