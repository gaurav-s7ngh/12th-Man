from typing import Any, Dict, List, Optional
import uuid
from sqlalchemy.orm import Session

from app.models.scouting import ScoutingReport, Shortlist, ShortlistPlayer
from app.repositories.scouting import ScoutingRepository
from app.schemas.scouting import ScoutingReportCreate, ShortlistCreate, ShortlistPlayerCreate


class ScoutingService:
    def __init__(self, db: Session):
        self.repo = ScoutingRepository(db)

    def list_reports(self, player_id: Optional[uuid.UUID] = None) -> List[ScoutingReport]:
        return self.repo.list_reports(player_id)

    def create_report(self, player_id: uuid.UUID, data: ScoutingReportCreate) -> ScoutingReport:
        return self.repo.create_report(
            player_id=player_id,
            scout_name=data.scout_name,
            position_assessed=data.position_assessed,
            technical_rating=data.technical_rating,
            tactical_rating=data.tactical_rating,
            physical_rating=data.physical_rating,
            mental_rating=data.mental_rating,
            overall_rating=data.overall_rating,
            strengths=data.strengths,
            weaknesses=data.weaknesses,
            written_observations=data.written_observations,
            assessment_date=data.assessment_date,
        )

    def list_shortlists(self) -> List[Dict[str, Any]]:
        shortlists = self.repo.list_shortlists()
        result = []
        for sl in shortlists:
            result.append({
                "id": sl.id,
                "name": sl.name,
                "description": sl.description,
                "owner": sl.owner,
                "created_at": sl.created_at,
                "updated_at": sl.updated_at,
                "player_count": len(sl.players) if hasattr(sl, "players") and sl.players else 0,
            })
        return result

    def get_shortlist_detail(self, shortlist_id: uuid.UUID) -> Optional[Shortlist]:
        return self.repo.get_shortlist(shortlist_id)

    def create_shortlist(self, data: ShortlistCreate) -> Shortlist:
        return self.repo.create_shortlist(
            name=data.name,
            description=data.description,
            owner=data.owner,
        )

    def add_player_to_shortlist(self, shortlist_id: uuid.UUID, data: ShortlistPlayerCreate) -> ShortlistPlayer:
        return self.repo.add_player_to_shortlist(
            shortlist_id=shortlist_id,
            player_id=data.player_id,
            notes=data.notes,
            status=data.recruitment_status,
        )

    def update_shortlist_player(
        self,
        entry_id: uuid.UUID,
        status: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Optional[ShortlistPlayer]:
        return self.repo.update_shortlist_player(
            entry_id=entry_id,
            status=status,
            notes=notes,
        )

    def advance_shortlist_player(self, entry_id: uuid.UUID) -> Optional[ShortlistPlayer]:
        return self.repo.advance_shortlist_player(entry_id)

    def remove_player_from_shortlist(self, entry_id: uuid.UUID) -> bool:
        return self.repo.remove_player_from_shortlist(entry_id)

    def delete_shortlist(self, shortlist_id: uuid.UUID) -> bool:
        return self.repo.delete_shortlist(shortlist_id)
