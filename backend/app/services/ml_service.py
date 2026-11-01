from datetime import datetime
import pathlib
import sys
from typing import Any, Dict, List, Optional
import uuid
from sqlalchemy import func, select
from sqlalchemy.orm import Session

# Add project root to sys.path so ml package can be imported
PROJECT_ROOT = str(pathlib.Path(__file__).resolve().parents[3])
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ml.clustering.archetypes import TacticalArchetypeClusterer
from ml.recruitment.similarity import PlayerSimilarityEngine
from ml.squad_analysis.gap_analyzer import SquadGapAnalyzer

from app.models.football import Player, PlayerAppearance, PlayerMatchStats


class MLService:
    """Orchestrates ML features, player similarity search, and tactical archetype clustering."""

    _similarity_engine: Optional[PlayerSimilarityEngine] = None
    _clusterer: Optional[TacticalArchetypeClusterer] = None
    _last_fitted: Optional[datetime] = None

    def __init__(self, db: Session):
        self.db = db

    def _load_player_stats_records(self, min_minutes: int = 90) -> List[Dict[str, Any]]:
        query = (
            select(
                Player.id.label("player_id"),
                Player.name.label("player_name"),
                Player.primary_position.label("primary_position"),
                Player.nationality.label("nationality"),
                func.sum(PlayerMatchStats.minutes_played).label("total_minutes"),
                func.sum(PlayerMatchStats.goals).label("goals"),
                func.sum(PlayerMatchStats.assists).label("assists"),
                func.sum(PlayerMatchStats.shots).label("shots"),
                func.sum(PlayerMatchStats.shots_on_target).label("shots_on_target"),
                func.sum(PlayerMatchStats.passes_completed).label("passes_completed"),
                func.sum(PlayerMatchStats.passes_attempted).label("passes_attempted"),
                func.sum(PlayerMatchStats.key_passes).label("key_passes"),
                func.sum(PlayerMatchStats.tackles).label("tackles"),
                func.sum(PlayerMatchStats.interceptions).label("interceptions"),
                func.sum(PlayerMatchStats.clearances).label("clearances"),
                func.sum(PlayerMatchStats.aerials_won).label("aerials_won"),
                func.sum(PlayerMatchStats.dribbles_completed).label("dribbles_completed"),
                func.sum(PlayerMatchStats.duels_won).label("duels_won"),
                func.sum(PlayerMatchStats.touches).label("touches"),
                func.sum(PlayerMatchStats.xg).label("xg"),
            )
            .join(PlayerMatchStats, PlayerMatchStats.player_id == Player.id)
            .group_by(Player.id)
            .having(func.sum(PlayerMatchStats.minutes_played) >= min_minutes)
        )
        rows = self.db.execute(query).all()

        records = []
        for r in rows:
            records.append({
                "player_id": r.player_id,
                "player_name": r.player_name,
                "primary_position": r.primary_position,
                "nationality": r.nationality,
                "total_minutes": r.total_minutes or 0,
                "goals": r.goals or 0,
                "assists": r.assists or 0,
                "shots": r.shots or 0,
                "shots_on_target": r.shots_on_target or 0,
                "passes_completed": r.passes_completed or 0,
                "passes_attempted": r.passes_attempted or 0,
                "key_passes": r.key_passes or 0,
                "tackles": r.tackles or 0,
                "interceptions": r.interceptions or 0,
                "clearances": r.clearances or 0,
                "aerials_won": r.aerials_won or 0,
                "dribbles_completed": r.dribbles_completed or 0,
                "duels_won": r.duels_won or 0,
                "touches": r.touches or 0,
                "xg": float(r.xg or 0.0),
            })
        return records

    @classmethod
    def reset_models(cls):
        """Force retrain models on current database records."""
        cls._similarity_engine = None
        cls._clusterer = None
        cls._last_fitted = None

    def _ensure_models(self):
        if MLService._similarity_engine is None or MLService._clusterer is None:
            records = self._load_player_stats_records(min_minutes=90)
            engine = PlayerSimilarityEngine(min_minutes=90)
            engine.fit(records)

            clusterer = TacticalArchetypeClusterer(n_clusters=6)
            clusterer.fit(records)

            MLService._similarity_engine = engine
            MLService._clusterer = clusterer
            MLService._last_fitted = datetime.utcnow()

    def get_similar_players(self, player_id: uuid.UUID, k: int = 6) -> List[Dict[str, Any]]:
        self._ensure_models()
        assert MLService._similarity_engine is not None
        return MLService._similarity_engine.find_similar(str(player_id), k=k)

    def get_archetypes(self) -> List[Dict[str, Any]]:
        self._ensure_models()
        assert MLService._clusterer is not None
        return MLService._clusterer.get_archetypes_summary()

    def get_player_archetype(self, player_id: uuid.UUID) -> Optional[Dict[str, Any]]:
        self._ensure_models()
        assert MLService._clusterer is not None
        return MLService._clusterer.predict_player_archetype(str(player_id))

    def analyze_squad_archetype_gaps(self, team_id: uuid.UUID) -> Dict[str, Any]:
        self._ensure_models()
        assert MLService._clusterer is not None

        # Fetch players for this team
        appearances = self.db.execute(
            select(PlayerAppearance.player_id)
            .where(PlayerAppearance.team_id == team_id)
            .distinct()
        ).scalars().all()

        analyzer = SquadGapAnalyzer(MLService._clusterer)
        return analyzer.analyze_squad_archetypes([str(pid) for pid in appearances])
