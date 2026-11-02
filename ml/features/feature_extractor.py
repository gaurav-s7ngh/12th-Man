from enum import Enum
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler


class PositionCohort(str, Enum):
    GOALKEEPER = "Goalkeeper"
    DEFENDER = "Defender"
    MIDFIELDER = "Midfielder"
    WINGER = "Winger"
    FORWARD = "Forward"


POSITION_MAPPING = {
    # Goalkeeper
    "Goalkeeper": PositionCohort.GOALKEEPER,
    "GK": PositionCohort.GOALKEEPER,

    # Defender: CB, LCB, RCB, LB, RB, LWB, RWB
    "Left Back": PositionCohort.DEFENDER,
    "Right Back": PositionCohort.DEFENDER,
    "Center Back": PositionCohort.DEFENDER,
    "Left Center Back": PositionCohort.DEFENDER,
    "Right Center Back": PositionCohort.DEFENDER,
    "Left Wing Back": PositionCohort.DEFENDER,
    "Right Wing Back": PositionCohort.DEFENDER,
    "CB": PositionCohort.DEFENDER,
    "LB": PositionCohort.DEFENDER,
    "RB": PositionCohort.DEFENDER,
    "LWB": PositionCohort.DEFENDER,
    "RWB": PositionCohort.DEFENDER,

    # Midfielder: CDM, DM, CM, LCM, RCM, CAM, AM, LM, RM
    "Defensive Midfield": PositionCohort.MIDFIELDER,
    "Center Defensive Midfield": PositionCohort.MIDFIELDER,
    "Left Defensive Midfield": PositionCohort.MIDFIELDER,
    "Right Defensive Midfield": PositionCohort.MIDFIELDER,
    "Center Midfield": PositionCohort.MIDFIELDER,
    "Left Center Midfield": PositionCohort.MIDFIELDER,
    "Right Center Midfield": PositionCohort.MIDFIELDER,
    "Left Midfield": PositionCohort.MIDFIELDER,
    "Right Midfield": PositionCohort.MIDFIELDER,
    "Center Attacking Midfield": PositionCohort.MIDFIELDER,
    "Left Attacking Midfield": PositionCohort.MIDFIELDER,
    "Right Attacking Midfield": PositionCohort.MIDFIELDER,
    "CDM": PositionCohort.MIDFIELDER,
    "DM": PositionCohort.MIDFIELDER,
    "CM": PositionCohort.MIDFIELDER,
    "CAM": PositionCohort.MIDFIELDER,
    "AM": PositionCohort.MIDFIELDER,
    "LM": PositionCohort.MIDFIELDER,
    "RM": PositionCohort.MIDFIELDER,

    # Winger: LW, RW, LWF, RWF
    "Left Wing": PositionCohort.WINGER,
    "Right Wing": PositionCohort.WINGER,
    "Left Wing Forward": PositionCohort.WINGER,
    "Right Wing Forward": PositionCohort.WINGER,
    "LW": PositionCohort.WINGER,
    "RW": PositionCohort.WINGER,
    "LWF": PositionCohort.WINGER,
    "RWF": PositionCohort.WINGER,

    # Forward: ST, CF, SS, LF, RF
    "Center Forward": PositionCohort.FORWARD,
    "Left Center Forward": PositionCohort.FORWARD,
    "Right Center Forward": PositionCohort.FORWARD,
    "Left Forward": PositionCohort.FORWARD,
    "Right Forward": PositionCohort.FORWARD,
    "Secondary Striker": PositionCohort.FORWARD,
    "Striker": PositionCohort.FORWARD,
    "CF": PositionCohort.FORWARD,
    "ST": PositionCohort.FORWARD,
    "SS": PositionCohort.FORWARD,
}

FEATURE_COLUMNS = [
    "goals_p90",
    "assists_p90",
    "xg_p90",
    "shots_p90",
    "shots_on_target_p90",
    "passes_completed_p90",
    "pass_completion_pct",
    "key_passes_p90",
    "tackles_p90",
    "interceptions_p90",
    "clearances_p90",
    "aerials_won_p90",
    "dribbles_completed_p90",
    "duels_won_p90",
    "touches_p90",
]


class FeatureExtractor:
    """Extracts, normalizes and scales per-90 tactical features for players."""

    def __init__(self, min_minutes: int = 180):
        self.min_minutes = min_minutes
        self.scalers: Dict[PositionCohort, StandardScaler] = {}

    @staticmethod
    def map_position_cohort(position_str: Optional[str]) -> PositionCohort:
        if not position_str:
            return PositionCohort.MIDFIELDER
        
        pos_clean = position_str.strip().lower()

        # 1. Exact match (case-insensitive) against dictionary keys
        for k, v in POSITION_MAPPING.items():
            if k.lower() == pos_clean:
                return v

        # 2. Check longer keys first to avoid short substring collisions (e.g. 'rw' matching 'forward')
        for k, v in sorted(POSITION_MAPPING.items(), key=lambda x: len(x[0]), reverse=True):
            if len(k) > 2 and k.lower() in pos_clean:
                return v

        # 3. Fallback by semantic keywords
        if "goalkeeper" in pos_clean or pos_clean == "gk":
            return PositionCohort.GOALKEEPER
        if "wing" in pos_clean:
            return PositionCohort.WINGER
        if "forward" in pos_clean or "striker" in pos_clean:
            return PositionCohort.FORWARD
        if "back" in pos_clean or "defen" in pos_clean:
            return PositionCohort.DEFENDER
        if "midfield" in pos_clean:
            return PositionCohort.MIDFIELDER

        return PositionCohort.MIDFIELDER

    def build_feature_dataframe(self, player_stats_records: List[Dict[str, Any]]) -> pd.DataFrame:
        """Converts raw aggregated player stats dicts into a structured DataFrame with per-90 metrics."""
        rows = []
        for r in player_stats_records:
            mins = float(r.get("total_minutes", 0))
            if mins < self.min_minutes:
                continue

            p90 = mins / 90.0 if mins > 0 else 1.0
            passes_att = float(r.get("passes_attempted", 0))
            passes_comp = float(r.get("passes_completed", 0))
            pass_pct = (passes_comp / passes_att * 100.0) if passes_att > 0 else 0.0

            cohort = self.map_position_cohort(r.get("primary_position"))

            row = {
                "player_id": str(r["player_id"]),
                "player_name": r.get("player_name", "Unknown"),
                "primary_position": r.get("primary_position", "Unknown"),
                "position_cohort": cohort.value,
                "nationality": r.get("nationality", "Unknown"),
                "total_minutes": int(mins),
                "goals_p90": float(r.get("goals", 0)) / p90,
                "assists_p90": float(r.get("assists", 0)) / p90,
                "xg_p90": float(r.get("xg", 0.0)) / p90,
                "shots_p90": float(r.get("shots", 0)) / p90,
                "shots_on_target_p90": float(r.get("shots_on_target", 0)) / p90,
                "passes_completed_p90": passes_comp / p90,
                "pass_completion_pct": pass_pct,
                "key_passes_p90": float(r.get("key_passes", 0)) / p90,
                "tackles_p90": float(r.get("tackles", 0)) / p90,
                "interceptions_p90": float(r.get("interceptions", 0)) / p90,
                "clearances_p90": float(r.get("clearances", 0)) / p90,
                "aerials_won_p90": float(r.get("aerials_won", 0)) / p90,
                "dribbles_completed_p90": float(r.get("dribbles_completed", 0)) / p90,
                "duels_won_p90": float(r.get("duels_won", 0)) / p90,
                "touches_p90": float(r.get("touches", 0)) / p90,
            }
            rows.append(row)

        df = pd.DataFrame(rows)
        if df.empty:
            return pd.DataFrame(columns=["player_id", "player_name", "position_cohort"] + FEATURE_COLUMNS)
        return df

    def fit_transform_cohort(self, df: pd.DataFrame, cohort: PositionCohort) -> Tuple[pd.DataFrame, np.ndarray]:
        """Filters DataFrame for a specific cohort and applies StandardScaler to feature columns."""
        cohort_df = df[df["position_cohort"] == cohort.value].copy().reset_index(drop=True)
        if cohort_df.empty or len(cohort_df) < 2:
            return cohort_df, np.empty((0, len(FEATURE_COLUMNS)))

        X = cohort_df[FEATURE_COLUMNS].to_numpy()
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        self.scalers[cohort] = scaler
        return cohort_df, X_scaled
