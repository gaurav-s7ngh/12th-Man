import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.football import TeamDetail, TeamRead
from app.services.team_service import TeamService

router = APIRouter(prefix="/teams", tags=["Teams"])


@router.get("", response_model=list[TeamRead])
def get_teams(db: Session = Depends(get_db)):
    service = TeamService(db)
    return service.list_teams()


@router.get("/{team_id}", response_model=TeamDetail)
def get_team(team_id: uuid.UUID, db: Session = Depends(get_db)):
    service = TeamService(db)
    team = service.get_team_detail(team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team
