from datetime import date
from typing import List, Optional
import uuid
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.scouting import ScoutingReport, Shortlist, ShortlistPlayer


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
        return self.db.execute(
            select(Shortlist)
            .options(
                selectinload(Shortlist.players).joinedload(ShortlistPlayer.player)
            )
            .where(Shortlist.id == shortlist_id)
        ).scalar_one_or_none()

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
        status: str = "Target",
    ) -> ShortlistPlayer:
        existing = self.db.execute(
            select(ShortlistPlayer).where(
                ShortlistPlayer.shortlist_id == shortlist_id,
                ShortlistPlayer.player_id == player_id,
            )
        ).scalar_one_or_none()

        if existing:
            if notes is not None:
                existing.notes = notes
            existing.recruitment_status = status
            self.db.commit()
            self.db.refresh(existing)
            return existing

        sp = ShortlistPlayer(
            shortlist_id=shortlist_id,
            player_id=player_id,
            notes=notes,
            recruitment_status=status,
        )
        self.db.add(sp)
        self.db.commit()
        self.db.refresh(sp)
        return sp
