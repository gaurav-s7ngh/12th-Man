from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler

from ml.features.feature_extractor import FEATURE_COLUMNS, FeatureExtractor


class TacticalArchetypeClusterer:
    """Discovers unsupervised tactical archetypes via PCA and K-Means clustering with human-interpretable labeling."""

    def __init__(self, n_clusters: int = 6, random_state: int = 42):
        self.n_clusters = n_clusters
        self.random_state = random_state
        self.extractor = FeatureExtractor(min_minutes=180)
        self.scaler = StandardScaler()
        self.pca = PCA(n_components=4, random_state=random_state)
        self.kmeans = KMeans(n_clusters=n_clusters, random_state=random_state, n_init=10)
        self.cluster_labels: Dict[int, str] = {}
        self.cluster_descriptions: Dict[int, str] = {}
        self.cluster_kpis: Dict[int, List[str]] = {}
        self.fitted_df: pd.DataFrame = pd.DataFrame()

    def fit(self, player_stats_records: List[Dict[str, Any]]) -> "TacticalArchetypeClusterer":
        df = self.extractor.build_feature_dataframe(player_stats_records)
        if df.empty or len(df) < self.n_clusters:
            return self

        X = df[FEATURE_COLUMNS].to_numpy()
        X_scaled = self.scaler.fit_transform(X)
        self.pca.fit(X_scaled)

        cluster_ids = self.kmeans.fit_predict(X_scaled)
        df["cluster_id"] = cluster_ids
        self.fitted_df = df

        # Analyze each cluster centroid to assign interpretable football labels
        centroids = self.kmeans.cluster_centers_  # shape: (n_clusters, n_features)

        for c_idx in range(self.n_clusters):
            c_center = centroids[c_idx]
            # Find the top features that distinguish this cluster above the average (z-score > 0)
            top_feature_indices = np.argsort(c_center)[::-1]
            top_feats = [FEATURE_COLUMNS[i] for i in top_feature_indices[:3]]
            self.cluster_kpis[c_idx] = [f.replace("_p90", "").replace("_", " ") for f in top_feats]

            # Heuristic archetype labeling based on leading characteristic
            leading_feat = FEATURE_COLUMNS[top_feature_indices[0]]
            second_feat = FEATURE_COLUMNS[top_feature_indices[1]]

            if "goals" in leading_feat or "xg" in leading_feat:
                label = "Clinical Box Finisher"
                desc = "Primary goal threat focused on penalty box arrivals, high-efficiency shooting, and offensive conversion."
            elif "passes_completed" in leading_feat or "pass_completion" in leading_feat:
                label = "Deep-Lying Tempo Controller"
                desc = "Circulates possession from deep, dictates match rhythm, and maintains exceptional ball security under pressure."
            elif "key_passes" in leading_feat or "assists" in leading_feat:
                label = "Creative Playmaker & Chance Creator"
                desc = "Operates in attacking half-spaces, unlocking compact defensive structures through decisive progressive passes."
            elif "tackles" in leading_feat or "interceptions" in leading_feat:
                label = "Defensive Disruptor & Ball Winner"
                desc = "Specializes in transition suppression, high-intensity pressing, and aggressive defensive interventions."
            elif "dribbles" in leading_feat or "touches" in leading_feat:
                label = "Progressive Ball-Carrier"
                desc = "Breaks opposition lines through dynamic dribbling, direct transitional carrying, and territorial advancement."
            elif "aerials" in leading_feat or "clearances" in leading_feat:
                label = "Dominant Aerial & Box Stopper"
                desc = "Physical anchor commanding defensive aerial duels, clearing crosses, and stabilizing the low defensive block."
            elif "duels" in leading_feat or "fouls" in leading_feat:
                label = "Physical Duelist & Press Anchor"
                desc = "Engages aggressively in second-ball battles, ground duels, and territorial containment."
            else:
                clean_lead = leading_feat.replace('_p90', '').replace('_', ' ').title()
                clean_sec = second_feat.replace('_p90', '').replace('_', ' ').title()
                label = f"{clean_lead} & {clean_sec} Specialist"
                desc = f"Tactical profile defined by above-average {clean_lead.lower()} and {clean_sec.lower()} output relative to position cohort."

            self.cluster_labels[c_idx] = label
            self.cluster_descriptions[c_idx] = desc

        return self

    def get_archetypes_summary(self) -> List[Dict[str, Any]]:
        """Returns summary of all tactical archetypes discovered across the data."""
        if self.fitted_df.empty:
            return []

        results = []
        for c_idx in range(self.n_clusters):
            count = int((self.fitted_df["cluster_id"] == c_idx).sum())
            pct = round((count / len(self.fitted_df) * 100.0), 1)
            members = self.fitted_df[self.fitted_df["cluster_id"] == c_idx].head(5)
            notable = [
                {"id": r["player_id"], "name": r["player_name"], "team": r["primary_position"]}
                for _, r in members.iterrows()
            ]

            results.append({
                "cluster_id": c_idx,
                "label": self.cluster_labels.get(c_idx, f"Archetype {c_idx}"),
                "description": self.cluster_descriptions.get(c_idx, ""),
                "leading_kpis": self.cluster_kpis.get(c_idx, []),
                "player_count": count,
                "percentage_of_pool": pct,
                "notable_players": notable,
            })

        return results

    def predict_player_archetype(self, player_id: str) -> Optional[Dict[str, Any]]:
        """Returns the assigned archetype and distance to centroid for a specific player."""
        if self.fitted_df.empty:
            return None

        match = self.fitted_df[self.fitted_df["player_id"] == str(player_id)]
        if match.empty:
            return None

        row = match.iloc[0]
        c_id = int(row["cluster_id"])

        return {
            "player_id": str(player_id),
            "player_name": row["player_name"],
            "cluster_id": c_id,
            "archetype_label": self.cluster_labels.get(c_id, f"Archetype {c_id}"),
            "description": self.cluster_descriptions.get(c_id, ""),
            "key_strengths": self.cluster_kpis.get(c_id, []),
        }
