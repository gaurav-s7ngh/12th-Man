from typing import Any, Dict, List, Optional
import uuid
from sqlalchemy.orm import Session

from app.models.football import Team
from app.repositories.team import TeamRepository


class TeamService:
    def __init__(self, db: Session):
        self.repo = TeamRepository(db)

    def list_teams(self) -> List[Team]:
        return self.repo.list_teams()

    def get_team_detail(self, team_id: uuid.UUID) -> Optional[Dict[str, Any]]:
        team = self.repo.get_by_id(team_id)
        if not team:
            return None

        players = self.repo.get_team_players(team_id)
        matches_count = self.repo.get_team_matches_count(team_id)

        return {
            "id": team.id,
            "external_id": team.external_id,
            "name": team.name,
            "country": team.country,
            "gender": team.gender,
            "matches_count": matches_count,
            "players_count": len(players),
            "players": players,
        }
