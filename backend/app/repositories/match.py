from typing import List, Optional, Tuple
import uuid
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.models.football import Competition, Match, Season, Team


class MatchRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_matches(
        self,
        skip: int = 0,
        limit: int = 50,
        competition_id: Optional[uuid.UUID] = None,
        season_id: Optional[uuid.UUID] = None,
        team_id: Optional[uuid.UUID] = None,
    ) -> Tuple[List[Match], int]:
        query = (
            select(Match)
            .options(
                joinedload(Match.home_team),
                joinedload(Match.away_team),
            )
        )

        if competition_id:
            query = query.where(Match.competition_id == competition_id)
        if season_id:
            query = query.where(Match.season_id == season_id)
        if team_id:
            query = query.where(
                (Match.home_team_id == team_id) | (Match.away_team_id == team_id)
            )

        count_query = select(func.count(Match.id))
        if competition_id:
            count_query = count_query.where(Match.competition_id == competition_id)
        if season_id:
            count_query = count_query.where(Match.season_id == season_id)
        if team_id:
            count_query = count_query.where(
                (Match.home_team_id == team_id) | (Match.away_team_id == team_id)
            )

        total = self.db.execute(count_query).scalar_one()

        matches = self.db.execute(
            query.order_by(Match.match_date.desc(), Match.id.asc()).offset(skip).limit(limit)
        ).scalars().all()

        return list(matches), total

    def get_by_id(self, match_id: uuid.UUID) -> Optional[Match]:
        return self.db.execute(
            select(Match)
            .options(
                joinedload(Match.home_team),
                joinedload(Match.away_team),
                joinedload(Match.competition),
                joinedload(Match.season),
            )
            .where(Match.id == match_id)
        ).scalar_one_or_none()

    def list_competitions(self) -> List[Competition]:
        return list(self.db.execute(
            select(Competition).order_by(Competition.name.asc())
        ).scalars().all())
