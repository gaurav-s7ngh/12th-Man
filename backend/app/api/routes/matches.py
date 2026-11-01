from typing import Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.common import PaginatedResponse
from app.schemas.football import MatchDetail, MatchRead
from app.services.match_service import MatchService

router = APIRouter(prefix="/matches", tags=["Matches"])


@router.get("", response_model=PaginatedResponse[MatchRead])
def get_matches(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    competition_id: Optional[uuid.UUID] = Query(None, description="Filter by competition UUID"),
    season_id: Optional[uuid.UUID] = Query(None, description="Filter by season UUID"),
    team_id: Optional[uuid.UUID] = Query(None, description="Filter by team UUID"),
    db: Session = Depends(get_db),
):
    service = MatchService(db)
    return service.list_matches(
        page=page,
        page_size=page_size,
        competition_id=competition_id,
        season_id=season_id,
        team_id=team_id,
    )


@router.get("/{match_id}", response_model=MatchDetail)
def get_match(match_id: uuid.UUID, db: Session = Depends(get_db)):
    service = MatchService(db)
    match = service.get_match_detail(match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    return match
