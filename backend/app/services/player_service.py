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
        nationality: Optional[str] = None,
        team_id: Optional[uuid.UUID] = None,
    ) -> Dict[str, Any]:
        page = max(1, page)
        page_size = min(100, max(1, page_size))
        skip = (page - 1) * page_size

        players, total = self.repo.list_players(
            skip=skip,
            limit=page_size,
            search=search,
            position=position,
            nationality=nationality,
            team_id=team_id,
        )

        total_pages = (total + page_size - 1) // page_size if total > 0 else 0

        return {
            "items": players,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        }

    def get_player_detail(self, player_id: uuid.UUID) -> Optional[Dict[str, Any]]:
        player = self.repo.get_by_id(player_id)
        if not player:
            return None

        apps = self.repo.get_appearances(player_id)
        teams = list({app.team for app in apps if app.team})
        total_minutes = sum(app.minutes_played or 0 for app in apps)
        agg_stats = self.repo.get_aggregated_stats(player_id)

        return {
            "id": player.id,
            "external_id": player.external_id,
            "name": player.name,
            "birth_date": player.birth_date,
            "nationality": player.nationality,
            "preferred_foot": player.preferred_foot,
            "height": player.height,
            "primary_position": player.primary_position,
            "appearances_count": len(apps),
            "total_minutes": total_minutes,
            "teams": teams,
            "aggregated_stats": agg_stats,
        }

    def get_player_appearances(self, player_id: uuid.UUID) -> List[PlayerAppearance]:
        return self.repo.get_appearances(player_id)

    def get_player_statistics(self, player_id: uuid.UUID) -> Dict[str, Any]:
        match_stats = self.repo.get_match_stats(player_id)
        aggregated = self.repo.get_aggregated_stats(player_id)
        return {
            "player_id": player_id,
            "match_stats": match_stats,
            "aggregated": aggregated,
        }
