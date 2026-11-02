from datetime import date
from typing import List, Optional
import uuid
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.scouting import ScoutingReport, Shortlist, ShortlistPlayer

PIPELINE_STAGES = [
    "Watchlist",
    "Shortlist",
    "Scout Review",
    "Follow-up",
    "Final Decision",
]

STAGE_NORMALIZATION = {
    "watchlist": "Watchlist",
    "watch": "Watchlist",
    "target": "Watchlist",
    "targeted": "Watchlist",
    "shortlist": "Shortlist",
    "shortlisted": "Shortlist",
    "scout review": "Scout Review",
    "scout_review": "Scout Review",
    "scout": "Scout Review",
    "review": "Scout Review",
    "follow-up": "Follow-up",
    "follow_up": "Follow-up",
    "followup": "Follow-up",
    "follow up": "Follow-up",
    "final decision": "Final Decision",
    "final_decision": "Final Decision",
    "decision": "Final Decision",
    "signed": "Final Decision",
}


def normalize_pipeline_stage(status_str: Optional[str]) -> str:
    if not status_str or not status_str.strip():
        return PIPELINE_STAGES[0]
    cleaned = status_str.strip().lower()
    return STAGE_NORMALIZATION.get(cleaned, PIPELINE_STAGES[0])


class ScoutingRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_reports(self, player_id: Optional[uuid.UUID] = None) -> List[ScoutingReport]:
        query = select(ScoutingReport)
        if player_id:
            query = query.where(ScoutingReport.player_id == player_id)
        return list(self.db.execute(
            query.order_by(ScoutingReport.assessment_date.desc(), ScoutingReport.created_at.desc())
        ).scalars().all())

    def create_report(
        self,
        player_id: uuid.UUID,
        scout_name: Optional[str] = None,
        position_assessed: Optional[str] = None,
        technical_rating: Optional[float] = None,
        tactical_rating: Optional[float] = None,
        physical_rating: Optional[float] = None,
        mental_rating: Optional[float] = None,
        overall_rating: Optional[float] = None,
        strengths=None,
        weaknesses=None,
        written_observations: Optional[str] = None,
        assessment_date: Optional[date] = None,
    ) -> ScoutingReport:
        report = ScoutingReport(
            player_id=player_id,
            scout_name=scout_name,
            position_assessed=position_assessed,
            technical_rating=technical_rating,
            tactical_rating=tactical_rating,
            physical_rating=physical_rating,
            mental_rating=mental_rating,
            overall_rating=overall_rating,
            strengths=strengths,
            weaknesses=weaknesses,
            written_observations=written_observations,
            assessment_date=assessment_date or date.today(),
        )
        self.db.add(report)
        self.db.commit()
        self.db.refresh(report)
        return report

    def list_shortlists(self) -> List[Shortlist]:
        return list(self.db.execute(
            select(Shortlist).order_by(Shortlist.created_at.desc())
        ).scalars().all())

    def get_shortlist(self, shortlist_id: uuid.UUID) -> Optional[Shortlist]:
        sl = self.db.execute(
            select(Shortlist)
            .options(
                selectinload(Shortlist.players).joinedload(ShortlistPlayer.player)
            )
            .where(Shortlist.id == shortlist_id)
        ).scalar_one_or_none()
        if sl:
            for p in sl.players:
                p.recruitment_status = normalize_pipeline_stage(p.recruitment_status)
        return sl

    def create_shortlist(
        self,
        name: str,
        description: Optional[str] = None,
        owner: Optional[str] = None,
    ) -> Shortlist:
        sl = Shortlist(
            name=name,
            description=description,
            owner=owner,
        )
        self.db.add(sl)
        self.db.commit()
        self.db.refresh(sl)
        return sl

    def add_player_to_shortlist(
        self,
        shortlist_id: uuid.UUID,
        player_id: uuid.UUID,
        notes: Optional[str] = None,
        status: str = "Watchlist",
    ) -> ShortlistPlayer:
        norm_status = normalize_pipeline_stage(status)
        existing = self.db.execute(
            select(ShortlistPlayer).where(
                ShortlistPlayer.shortlist_id == shortlist_id,
                ShortlistPlayer.player_id == player_id,
            )
        ).scalar_one_or_none()

        if existing:
            if notes is not None:
                existing.notes = notes
            existing.recruitment_status = norm_status
            self.db.commit()
            self.db.refresh(existing)
            return existing

        sp = ShortlistPlayer(
            shortlist_id=shortlist_id,
            player_id=player_id,
            notes=notes,
            recruitment_status=norm_status,
        )
        self.db.add(sp)
        self.db.commit()
        self.db.refresh(sp)
        return sp

    def update_shortlist_player(
        self,
        entry_id: uuid.UUID,
        status: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Optional[ShortlistPlayer]:
        sp = self.db.execute(
            select(ShortlistPlayer)
            .options(joinedload(ShortlistPlayer.player))
            .where(ShortlistPlayer.id == entry_id)
        ).scalar_one_or_none()
        if not sp:
            return None

        if status is not None:
            sp.recruitment_status = normalize_pipeline_stage(status)
        if notes is not None:
            sp.notes = notes

        self.db.commit()
        self.db.refresh(sp)
        return sp

    def advance_shortlist_player(self, entry_id: uuid.UUID) -> Optional[ShortlistPlayer]:
        sp = self.db.execute(
            select(ShortlistPlayer)
            .options(joinedload(ShortlistPlayer.player))
            .where(ShortlistPlayer.id == entry_id)
        ).scalar_one_or_none()
        if not sp:
            return None

        current_stage = normalize_pipeline_stage(sp.recruitment_status)
        try:
            curr_idx = PIPELINE_STAGES.index(current_stage)
        except ValueError:
            curr_idx = 0

        # Advance exactly one stage forward if not at Final Decision
        if curr_idx < len(PIPELINE_STAGES) - 1:
            next_stage = PIPELINE_STAGES[curr_idx + 1]
            sp.recruitment_status = next_stage
            self.db.commit()
            self.db.refresh(sp)

        return sp

    def remove_player_from_shortlist(self, entry_id: uuid.UUID) -> bool:
        sp = self.db.execute(
            select(ShortlistPlayer).where(ShortlistPlayer.id == entry_id)
        ).scalar_one_or_none()
        if not sp:
            return False
        self.db.delete(sp)
        self.db.commit()
        return True

    def delete_shortlist(self, shortlist_id: uuid.UUID) -> bool:
        sl = self.db.execute(
            select(Shortlist).where(Shortlist.id == shortlist_id)
        ).scalar_one_or_none()
        if not sl:
            return False
        self.db.delete(sl)
        self.db.commit()
        return True
