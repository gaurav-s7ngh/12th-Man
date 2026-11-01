from typing import Any, Dict, List, Optional, Tuple
import uuid
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.football import Match, Player, PlayerAppearance, PlayerMatchStats, Team


class PlayerRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_players(
        self,
        skip: int = 0,
        limit: int = 50,
        search: Optional[str] = None,
        position: Optional[str] = None,
        nationality: Optional[str] = None,
        team_id: Optional[uuid.UUID] = None,
    ) -> Tuple[List[Player], int]:
        query = select(Player)

        if search:
            query = query.where(Player.name.ilike(f"%{search}%"))
        if position:
            query = query.where(Player.primary_position.ilike(f"%{position}%"))
        if nationality:
            query = query.where(Player.nationality.ilike(f"%{nationality}%"))
        if team_id:
            query = query.join(PlayerAppearance).where(PlayerAppearance.team_id == team_id).distinct()

        # Count total
        count_query = select(func.count(func.distinct(Player.id)))
        if search:
            count_query = count_query.where(Player.name.ilike(f"%{search}%"))
        if position:
            count_query = count_query.where(Player.primary_position.ilike(f"%{position}%"))
        if nationality:
            count_query = count_query.where(Player.nationality.ilike(f"%{nationality}%"))
        if team_id:
            count_query = count_query.join(PlayerAppearance).where(PlayerAppearance.team_id == team_id)

        total = self.db.execute(count_query).scalar_one()

        players = self.db.execute(
            query.order_by(Player.name.asc()).offset(skip).limit(limit)
        ).scalars().all()

        return list(players), total

    def get_by_id(self, player_id: uuid.UUID) -> Optional[Player]:
        return self.db.execute(
            select(Player).where(Player.id == player_id)
        ).scalar_one_or_none()

    def get_appearances(self, player_id: uuid.UUID) -> List[PlayerAppearance]:
        return list(self.db.execute(
            select(PlayerAppearance)
            .options(
                joinedload(PlayerAppearance.match).joinedload(Match.home_team),
                joinedload(PlayerAppearance.match).joinedload(Match.away_team),
            )
            .where(PlayerAppearance.player_id == player_id)
            .order_by(PlayerAppearance.created_at.desc())
        ).scalars().all())

    def get_match_stats(self, player_id: uuid.UUID) -> List[PlayerMatchStats]:
        return list(self.db.execute(
            select(PlayerMatchStats)
            .options(
                joinedload(PlayerMatchStats.match).joinedload(Match.home_team),
                joinedload(PlayerMatchStats.match).joinedload(Match.away_team),
            )
            .where(PlayerMatchStats.player_id == player_id)
        ).scalars().all())

    def get_aggregated_stats(self, player_id: uuid.UUID) -> Optional[Dict[str, Any]]:
        stats_list = self.get_match_stats(player_id)
        if not stats_list:
            return None

        apps = self.get_appearances(player_id)
        starts = sum(1 for a in apps if a.is_starter)
        subs = sum(1 for a in apps if a.is_substitute)

        total_mins = sum(s.minutes_played for s in stats_list)
        goals = sum(s.goals for s in stats_list)
        assists = sum(s.assists for s in stats_list)
        shots = sum(s.shots for s in stats_list)
        shots_on_target = sum(s.shots_on_target for s in stats_list)
        passes_att = sum(s.passes_attempted for s in stats_list)
        passes_comp = sum(s.passes_completed for s in stats_list)
        pass_pct = round((passes_comp / passes_att * 100), 1) if passes_att > 0 else 0.0
        key_passes = sum(s.key_passes for s in stats_list)
        tackles = sum(s.tackles for s in stats_list)
        interceptions = sum(s.interceptions for s in stats_list)
        clearances = sum(s.clearances for s in stats_list)
        aerials_won = sum(s.aerials_won for s in stats_list)
        dribbles = sum(s.dribbles_completed for s in stats_list)
        duels_won = sum(s.duels_won for s in stats_list)
        touches = sum(s.touches for s in stats_list)
        total_xg = round(sum(s.xg or 0.0 for s in stats_list), 2)
        total_xa = round(sum(s.xa or 0.0 for s in stats_list), 2)

        # per 90 metrics
        p90_factor = (total_mins / 90.0) if total_mins > 0 else 0.0

        def per_90(val: float) -> float:
            return round(val / p90_factor, 2) if p90_factor > 0 else 0.0

        return {
            "matches_played": len(apps),
            "starts": starts,
            "sub_appearances": subs,
            "total_minutes": total_mins,
            "goals": goals,
            "assists": assists,
            "shots": shots,
            "shots_on_target": shots_on_target,
            "passes_attempted": passes_att,
            "passes_completed": passes_comp,
            "pass_completion_pct": pass_pct,
            "key_passes": key_passes,
            "tackles": tackles,
            "interceptions": interceptions,
            "clearances": clearances,
            "aerials_won": aerials_won,
            "dribbles_completed": dribbles,
            "duels_won": duels_won,
            "touches": touches,
            "total_xg": total_xg,
            "total_xa": total_xa,
            "xg_per_90": per_90(total_xg),
            "xa_per_90": per_90(total_xa),
            "goals_per_90": per_90(goals),
            "assists_per_90": per_90(assists),
            "key_passes_per_90": per_90(key_passes),
            "tackles_per_90": per_90(tackles),
            "interceptions_per_90": per_90(interceptions),
        }
