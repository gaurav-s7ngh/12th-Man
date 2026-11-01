from typing import Any, Dict, List, Optional
import uuid
from sqlalchemy.orm import Session

from app.models.football import Competition, Match, Season
from app.repositories.match import MatchRepository


class MatchService:
    def __init__(self, db: Session):
        self.repo = MatchRepository(db)

    def list_matches(
        self,
        page: int = 1,
        page_size: int = 20,
        competition_id: Optional[uuid.UUID] = None,
        season_id: Optional[uuid.UUID] = None,
        team_id: Optional[uuid.UUID] = None,
    ) -> Dict[str, Any]:
        page = max(1, page)
        page_size = min(100, max(1, page_size))
        skip = (page - 1) * page_size

        matches, total = self.repo.list_matches(
            skip=skip,
            limit=page_size,
            competition_id=competition_id,
            season_id=season_id,
            team_id=team_id,
        )

        total_pages = (total + page_size - 1) // page_size if total > 0 else 0

        return {
            "items": matches,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        }

    def get_match_detail(self, match_id: uuid.UUID) -> Optional[Match]:
        return self.repo.get_by_id(match_id)

    def list_competitions(self) -> List[Competition]:
        return self.repo.list_competitions()

    def list_seasons(self) -> List[Season]:
        return self.repo.list_seasons()
