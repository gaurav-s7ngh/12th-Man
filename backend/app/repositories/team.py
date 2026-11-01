from typing import List, Optional
import uuid
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.football import Match, Player, PlayerAppearance, Team


class TeamRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_teams(self) -> List[Team]:
        return list(self.db.execute(
            select(Team).order_by(Team.name.asc())
        ).scalars().all())

    def get_by_id(self, team_id: uuid.UUID) -> Optional[Team]:
        return self.db.execute(
            select(Team).where(Team.id == team_id)
        ).scalar_one_or_none()

    def get_team_players(self, team_id: uuid.UUID) -> List[Player]:
        return list(self.db.execute(
            select(Player)
            .join(PlayerAppearance, PlayerAppearance.player_id == Player.id)
            .where(PlayerAppearance.team_id == team_id)
            .distinct()
            .order_by(Player.name.asc())
        ).scalars().all())

    def get_team_matches_count(self, team_id: uuid.UUID) -> int:
        return self.db.execute(
            select(func.count(Match.id)).where(
                (Match.home_team_id == team_id) | (Match.away_team_id == team_id)
            )
        ).scalar_one()
