from typing import Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.common import PaginatedResponse
from app.schemas.football import PlayerDetail, PlayerMatchStatsRead, PlayerRead
from app.schemas.scouting import ScoutingReportCreate, ScoutingReportRead
from app.services.player_service import PlayerService
from app.services.scouting_service import ScoutingService

router = APIRouter(prefix="/players", tags=["Players"])


@router.get("", response_model=PaginatedResponse[PlayerRead])
def get_players(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search player name"),
    position: Optional[str] = Query(None, description="Filter by position"),
    nationality: Optional[str] = Query(None, description="Filter by nationality"),
    team_id: Optional[uuid.UUID] = Query(None, description="Filter by team UUID"),
    db: Session = Depends(get_db),
):
    service = PlayerService(db)
    return service.list_players(
        page=page,
        page_size=page_size,
        search=search,
        position=position,
        nationality=nationality,
        team_id=team_id,
    )


@router.get("/{player_id}", response_model=PlayerDetail)
def get_player(
    player_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    service = PlayerService(db)
    player = service.get_player_detail(player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return player


@router.get("/{player_id}/statistics")
def get_player_statistics(
    player_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    service = PlayerService(db)
    player = service.get_player_detail(player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return service.get_player_statistics(player_id)


@router.get("/{player_id}/scouting-reports", response_model=list[ScoutingReportRead])
def get_player_scouting_reports(
    player_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    player_service = PlayerService(db)
    if not player_service.get_player_detail(player_id):
        raise HTTPException(status_code=404, detail="Player not found")

    scouting_service = ScoutingService(db)
    return scouting_service.list_reports(player_id)


@router.post("/{player_id}/scouting-reports", response_model=ScoutingReportRead, status_code=201)
def create_player_scouting_report(
    player_id: uuid.UUID,
    report_in: ScoutingReportCreate,
    db: Session = Depends(get_db),
):
    player_service = PlayerService(db)
    if not player_service.get_player_detail(player_id):
        raise HTTPException(status_code=404, detail="Player not found")

    scouting_service = ScoutingService(db)
    return scouting_service.create_report(player_id, report_in)
