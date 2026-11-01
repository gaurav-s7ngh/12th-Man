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
    role: Optional[str] = Query(None, description="Filter by tactical role"),
    nationality: Optional[str] = Query(None, description="Filter by nationality"),
    preferred_foot: Optional[str] = Query(None, description="Filter by preferred foot (Right, Left, Both)"),
    team_id: Optional[uuid.UUID] = Query(None, description="Filter by team UUID"),
    competition_id: Optional[uuid.UUID] = Query(None, description="Filter by competition UUID"),
    season_id: Optional[uuid.UUID] = Query(None, description="Filter by season UUID"),
    min_minutes: Optional[int] = Query(None, ge=0, description="Minimum total minutes played"),
    max_minutes: Optional[int] = Query(None, ge=0, description="Maximum total minutes played"),
    min_age: Optional[int] = Query(None, ge=14, le=45, description="Minimum age"),
    max_age: Optional[int] = Query(None, ge=14, le=45, description="Maximum age"),
    sort_by: Optional[str] = Query("name", description="Sort by field: name, minutes, goals, assists, position"),
    sort_order: Optional[str] = Query("asc", description="Sort direction: asc or desc"),
    db: Session = Depends(get_db),
):
    service = PlayerService(db)
    return service.list_players(
        page=page,
        page_size=page_size,
        search=search,
        position=position,
        role=role,
        nationality=nationality,
        preferred_foot=preferred_foot,
        team_id=team_id,
        competition_id=competition_id,
        season_id=season_id,
        min_minutes=min_minutes,
        max_minutes=max_minutes,
        min_age=min_age,
        max_age=max_age,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get("/{player_id}", response_model=PlayerDetail)
def get_player(
    player_id: uuid.UUID,
    competition_id: Optional[uuid.UUID] = Query(None, description="Filter stats by competition UUID"),
    season_id: Optional[uuid.UUID] = Query(None, description="Filter stats by season UUID"),
    db: Session = Depends(get_db),
):
    service = PlayerService(db)
    player = service.get_player_detail(player_id, competition_id=competition_id, season_id=season_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return player


@router.get("/{player_id}/statistics")
def get_player_statistics(
    player_id: uuid.UUID,
    competition_id: Optional[uuid.UUID] = Query(None, description="Filter stats by competition UUID"),
    season_id: Optional[uuid.UUID] = Query(None, description="Filter stats by season UUID"),
    db: Session = Depends(get_db),
):
    service = PlayerService(db)
    player = service.get_player_detail(player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return service.get_player_statistics(player_id, competition_id=competition_id, season_id=season_id)


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
