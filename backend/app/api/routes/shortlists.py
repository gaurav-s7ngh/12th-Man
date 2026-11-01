import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.scouting import (
    ShortlistCreate,
    ShortlistDetail,
    ShortlistPlayerCreate,
    ShortlistPlayerRead,
    ShortlistRead,
)
from app.services.scouting_service import ScoutingService

router = APIRouter(prefix="/shortlists", tags=["Shortlists"])


@router.get("", response_model=list[ShortlistRead])
def get_shortlists(db: Session = Depends(get_db)):
    service = ScoutingService(db)
    return service.list_shortlists()


@router.post("", response_model=ShortlistRead, status_code=201)
def create_shortlist(data: ShortlistCreate, db: Session = Depends(get_db)):
    service = ScoutingService(db)
    return service.create_shortlist(data)


@router.get("/{shortlist_id}", response_model=ShortlistDetail)
def get_shortlist(shortlist_id: uuid.UUID, db: Session = Depends(get_db)):
    service = ScoutingService(db)
    sl = service.get_shortlist_detail(shortlist_id)
    if not sl:
        raise HTTPException(status_code=404, detail="Shortlist not found")
    return sl


@router.post("/{shortlist_id}/players", response_model=ShortlistPlayerRead, status_code=201)
def add_player_to_shortlist(
    shortlist_id: uuid.UUID,
    data: ShortlistPlayerCreate,
    db: Session = Depends(get_db),
):
    service = ScoutingService(db)
    sl = service.get_shortlist_detail(shortlist_id)
    if not sl:
        raise HTTPException(status_code=404, detail="Shortlist not found")

    return service.add_player_to_shortlist(shortlist_id, data)
