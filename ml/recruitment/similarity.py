from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import StandardScaler

from ml.features.feature_extractor import FEATURE_COLUMNS, FeatureExtractor, PositionCohort


class PlayerSimilarityEngine:
    """k-NN Cosine Similarity Engine for finding comparable player profiles across competitions."""

    def __init__(self, min_minutes: int = 180):
        self.extractor = FeatureExtractor(min_minutes=min_minutes)
        self.models: Dict[str, NearestNeighbors] = {}
        self.scalers: Dict[str, StandardScaler] = {}
        self.cohort_dfs: Dict[str, pd.DataFrame] = {}
        self.scaled_matrices: Dict[str, np.ndarray] = {}
        self.full_df: pd.DataFrame = pd.DataFrame()

    def fit(self, player_stats_records: List[Dict[str, Any]]) -> "PlayerSimilarityEngine":
        """Fits NearestNeighbors on each position cohort."""
        self.full_df = self.extractor.build_feature_dataframe(player_stats_records)
        if self.full_df.empty:
            return self

        for cohort in [PositionCohort.DEFENDER, PositionCohort.MIDFIELDER, PositionCohort.FORWARD]:
            cohort_df = self.full_df[self.full_df["position_cohort"] == cohort.value].copy().reset_index(drop=True)
            if len(cohort_df) < 3:
                continue

            X = cohort_df[FEATURE_COLUMNS].to_numpy()
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X)

            # Fit k-NN using cosine distance
            nn = NearestNeighbors(metric="cosine", algorithm="brute")
            nn.fit(X_scaled)

            c_key = cohort.value
            self.cohort_dfs[c_key] = cohort_df
            self.scalers[c_key] = scaler
            self.scaled_matrices[c_key] = X_scaled
            self.models[c_key] = nn

        return self

    def find_similar(
        self,
        player_id: str,
        k: int = 6,
        exclude_same_team: bool = False,
    ) -> List[Dict[str, Any]]:
        """Finds top-k most similar players to the target player."""
        if self.full_df.empty:
            return []

        target_matches = self.full_df[self.full_df["player_id"] == str(player_id)]
        if target_matches.empty:
            return []

        target_row = target_matches.iloc[0]
        cohort_key = target_row["position_cohort"]

        model = self.models.get(cohort_key)
        cohort_df = self.cohort_dfs.get(cohort_key)
        scaler = self.scalers.get(cohort_key)
        if model is None or cohort_df is None or scaler is None:
            return []

        target_vec = target_row[FEATURE_COLUMNS].to_numpy().reshape(1, -1)
        target_scaled = scaler.transform(target_vec)

        # Query top-k+1 neighbors (to allow filtering self)
        n_neighbors = min(len(cohort_df), k + 2)
        distances, indices = model.kneighbors(target_scaled, n_neighbors=n_neighbors)

        results = []
        for dist, idx in zip(distances[0], indices[0]):
            cand = cohort_df.iloc[idx]
            cand_id = cand["player_id"]
            if cand_id == str(player_id):
                continue  # Skip self

            # Cosine similarity percentage: cosine_sim = 1 - cosine_dist
            similarity_pct = max(0.0, min(100.0, round((1.0 - float(dist)) * 100.0, 1)))

            # Compare specific feature differences
            cand_vec = cand[FEATURE_COLUMNS].to_numpy().reshape(1, -1)
            cand_scaled = scaler.transform(cand_vec)[0]
            t_scaled = target_scaled[0]

            # Find closest features
            abs_diffs = np.abs(t_scaled - cand_scaled)
            closest_feat_indices = np.argsort(abs_diffs)[:3]
            divergent_feat_indices = np.argsort(abs_diffs)[-2:]

            shared_traits = [
                f"Close {FEATURE_COLUMNS[i].replace('_', ' ')}: {round(float(cand[FEATURE_COLUMNS[i]]), 2)} vs {round(float(target_row[FEATURE_COLUMNS[i]]), 2)}"
                for i in closest_feat_indices
            ]
            divergences = [
                f"Different {FEATURE_COLUMNS[i].replace('_', ' ')}: {round(float(cand[FEATURE_COLUMNS[i]]), 2)} vs {round(float(target_row[FEATURE_COLUMNS[i]]), 2)}"
                for i in divergent_feat_indices
            ]

            results.append({
                "player_id": cand_id,
                "player_name": cand["player_name"],
                "primary_position": cand["primary_position"],
                "position_cohort": cand["position_cohort"],
                "nationality": cand["nationality"],
                "total_minutes": int(cand["total_minutes"]),
                "similarity_score": similarity_pct,
                "shared_traits": shared_traits,
                "key_divergence": divergences[0] if divergences else None,
            })

            if len(results) >= k:
                break

        return results
