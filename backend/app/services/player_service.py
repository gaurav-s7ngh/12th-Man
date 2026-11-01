from collections import defaultdict
from typing import Any, Dict, List, Optional
import uuid
from sqlalchemy.orm import Session

from app.models.football import Player, PlayerAppearance, PlayerMatchStats
from app.repositories.player import PlayerRepository


class PlayerService:
    def __init__(self, db: Session):
        self.repo = PlayerRepository(db)

    def list_players(
        self,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
        position: Optional[str] = None,
        role: Optional[str] = None,
        nationality: Optional[str] = None,
        preferred_foot: Optional[str] = None,
        team_id: Optional[uuid.UUID] = None,
        competition_id: Optional[uuid.UUID] = None,
        season_id: Optional[uuid.UUID] = None,
        min_minutes: Optional[int] = None,
        max_minutes: Optional[int] = None,
        min_age: Optional[int] = None,
        max_age: Optional[int] = None,
        sort_by: Optional[str] = "name",
        sort_order: Optional[str] = "asc",
    ) -> Dict[str, Any]:
        page = max(1, page)
        page_size = min(100, max(1, page_size))
        skip = (page - 1) * page_size

        players, total = self.repo.list_players(
            skip=skip,
            limit=page_size,
            search=search,
            position=position,
            role=role,
            nationality=nationality,
            preferred_foot=preferred_foot,
            team_id=team_id,
            competition_id=competition_id,
            season_id=season_id,
            min_minutes=min_minutes,
            max_minutes=max_minutes,
            min_age=min_age,
            max_age=max_age,
            sort_by=sort_by,
            sort_order=sort_order,
        )

        total_pages = (total + page_size - 1) // page_size if total > 0 else 0

        return {
            "items": players,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        }

    def get_player_detail(
        self,
        player_id: uuid.UUID,
        competition_id: Optional[uuid.UUID] = None,
        season_id: Optional[uuid.UUID] = None,
    ) -> Optional[Dict[str, Any]]:
        player = self.repo.get_by_id(player_id)
        if not player:
            return None

        all_apps = self.repo.get_appearances(player_id)
        filtered_apps = self.repo.get_appearances(player_id, competition_id=competition_id, season_id=season_id)
        teams = list({app.team for app in all_apps if app.team})
        total_minutes = sum(app.minutes_played or 0 for app in filtered_apps)
        agg_stats = self.repo.get_aggregated_stats(player_id, competition_id=competition_id, season_id=season_id)

        # Competition breakdowns
        all_stats = self.repo.get_match_stats(player_id)
        comp_groups = defaultdict(list)
        for s in all_stats:
            if s.match and s.match.competition and s.match.season:
                comp_key = (s.match.competition.id, s.match.competition.name, s.match.season.id, s.match.season.name)
                comp_groups[comp_key].append(s)

        breakdowns = []
        for (c_id, c_name, s_id, s_name), m_stats in comp_groups.items():
            comp_mins = sum(ms.minutes_played for ms in m_stats)
            comp_goals = sum(ms.goals for ms in m_stats)
            comp_assists = sum(ms.assists for ms in m_stats)
            comp_xg = sum(ms.xg or 0.0 for ms in m_stats)
            breakdowns.append({
                "competition_id": c_id,
                "competition_name": c_name,
                "season_id": s_id,
                "season_name": s_name,
                "matches": len(m_stats),
                "minutes": comp_mins,
                "goals": comp_goals,
                "assists": comp_assists,
                "xg": round(comp_xg, 2),
                "sample_confidence": (
                    "Sufficient (>270 mins)"
                    if comp_mins >= 270
                    else "Limited Sample (90-269 mins)"
                    if comp_mins >= 90
                    else "Insufficient (<90 mins)"
                ),
            })

        sample_conf = (
            "Sufficient (>270 mins)"
            if total_minutes >= 270
            else "Limited Sample (90-269 mins)"
            if total_minutes >= 90
            else "Insufficient (<90 mins)"
        )

        return {
            "id": player.id,
            "external_id": player.external_id,
            "name": player.name,
            "birth_date": player.birth_date,
            "nationality": player.nationality,
            "preferred_foot": player.preferred_foot,
            "height": player.height,
            "primary_position": player.primary_position,
            "appearances_count": len(filtered_apps),
            "total_minutes": total_minutes,
            "teams": teams,
            "aggregated_stats": agg_stats,
            "competition_breakdowns": breakdowns,
            "sample_confidence": sample_conf,
        }

    def get_player_appearances(
        self,
        player_id: uuid.UUID,
        competition_id: Optional[uuid.UUID] = None,
        season_id: Optional[uuid.UUID] = None,
    ) -> List[PlayerAppearance]:
        return self.repo.get_appearances(player_id, competition_id=competition_id, season_id=season_id)

    def get_player_statistics(
        self,
        player_id: uuid.UUID,
        competition_id: Optional[uuid.UUID] = None,
        season_id: Optional[uuid.UUID] = None,
    ) -> Dict[str, Any]:
        match_stats = self.repo.get_match_stats(player_id, competition_id=competition_id, season_id=season_id)
        aggregated = self.repo.get_aggregated_stats(player_id, competition_id=competition_id, season_id=season_id)
        return {
            "player_id": player_id,
            "match_stats": match_stats,
            "aggregated": aggregated,
        }
