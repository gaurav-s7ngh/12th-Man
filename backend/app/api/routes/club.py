from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.club import (
    AvailableClubItem,
    ClubRead,
    ClubUpdate,
    RecruitmentNeedCreate,
    RecruitmentNeedRead,
    RecruitmentNeedUpdate,
    SquadAssessmentRead,
)
from app.services.squad_service import SquadService

router = APIRouter(prefix="/club", tags=["Club & Squad Management"])


@router.get("", response_model=ClubRead)
def get_club(
    club_id: Optional[uuid.UUID] = Query(None, description="Optional club UUID"),
    db: Session = Depends(get_db),
):
    service = SquadService(db)
    return service.get_or_create_club(club_id=club_id)


@router.get("/available", response_model=List[AvailableClubItem])
def list_available_clubs(db: Session = Depends(get_db)):
    service = SquadService(db)
    return service.list_available_clubs()


@router.post("/select/{target_id}", response_model=ClubRead)
def select_active_club(target_id: uuid.UUID, db: Session = Depends(get_db)):
    service = SquadService(db)
    try:
        return service.select_active_club(target_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("", response_model=ClubRead)
def update_club(data: ClubUpdate, db: Session = Depends(get_db)):
    service = SquadService(db)
    current = service.get_or_create_club()
    updated = service.update_club(current.id, data)
    if not updated:
        raise HTTPException(status_code=400, detail="Failed to update club.")
    return updated


@router.get("/squad-assessment", response_model=SquadAssessmentRead)
def get_squad_assessment(
    club_id: Optional[uuid.UUID] = Query(None, description="Optional club UUID"),
    team_id: Optional[uuid.UUID] = Query(None, description="Optional team UUID"),
    db: Session = Depends(get_db),
):
    service = SquadService(db)
    return service.assess_squad(club_id=club_id, team_id=team_id)


@router.get("/recruitment-needs", response_model=List[RecruitmentNeedRead])
def get_recruitment_needs(
    club_id: Optional[uuid.UUID] = Query(None, description="Optional club UUID"),
    db: Session = Depends(get_db),
):
    service = SquadService(db)
    return service.list_recruitment_needs(club_id=club_id)


@router.post("/recruitment-needs", response_model=RecruitmentNeedRead, status_code=201)
def create_recruitment_need(
    data: RecruitmentNeedCreate,
    club_id: Optional[uuid.UUID] = Query(None, description="Optional club UUID"),
    db: Session = Depends(get_db),
):
    service = SquadService(db)
    club = service.get_or_create_club(club_id=club_id)
    return service.create_recruitment_need(club.id, data)


@router.put("/recruitment-needs/{need_id}", response_model=RecruitmentNeedRead)
def update_recruitment_need(
    need_id: uuid.UUID,
    data: RecruitmentNeedUpdate,
    db: Session = Depends(get_db),
):
    service = SquadService(db)
    updated = service.update_recruitment_need(need_id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="Recruitment need not found.")
    return updated


@router.delete("/recruitment-needs/{need_id}", status_code=204)
def delete_recruitment_need(need_id: uuid.UUID, db: Session = Depends(get_db)):
    service = SquadService(db)
    deleted = service.delete_recruitment_need(need_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Recruitment need not found.")
    return None
