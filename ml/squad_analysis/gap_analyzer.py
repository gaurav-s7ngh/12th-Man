from typing import Any, Dict, List, Optional
import pandas as pd

from ml.clustering.archetypes import TacticalArchetypeClusterer


class SquadGapAnalyzer:
    """Detects missing tactical archetypes and positional vulnerabilities in a squad."""

    def __init__(self, clusterer: TacticalArchetypeClusterer):
        self.clusterer = clusterer

    def analyze_squad_archetypes(
        self, squad_player_ids: List[str], required_roles: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Maps squad players to discovered archetypes and identifies deficits."""
        if self.clusterer.fitted_df.empty:
            return {"error": "Clusterer not fitted."}

        squad_ids_str = [str(pid) for pid in squad_player_ids]
        squad_df = self.clusterer.fitted_df[self.clusterer.fitted_df["player_id"].isin(squad_ids_str)]

        archetype_counts: Dict[str, int] = {}
        archetype_players: Dict[str, List[str]] = {}

        for c_idx in range(self.clusterer.n_clusters):
            label = self.clusterer.cluster_labels.get(c_idx, f"Archetype {c_idx}")
            members = squad_df[squad_df["cluster_id"] == c_idx]
            archetype_counts[label] = int(len(members))
            archetype_players[label] = members["player_name"].tolist()

        # Identify missing or critical gaps
        missing_archetypes = []
        for label, count in archetype_counts.items():
            if count == 0:
                missing_archetypes.append({
                    "archetype": label,
                    "status": "Absent",
                    "tactical_impact": f"No current squad member embodies the '{label}' profile, limiting tactical flexibility.",
                })
            elif count == 1:
                missing_archetypes.append({
                    "archetype": label,
                    "status": "Isolated (Single Point of Failure)",
                    "tactical_impact": f"Only 1 squad member ({archetype_players[label][0]}) fills this role. Vulnerable to injury/fatigue.",
                })

        return {
            "squad_evaluated_count": len(squad_df),
            "archetype_distribution": archetype_counts,
            "archetype_roster": archetype_players,
            "tactical_vulnerabilities": missing_archetypes,
        }
