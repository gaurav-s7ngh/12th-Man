from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.football import CompetitionRead, SeasonRead
from app.services.match_service import MatchService

router = APIRouter(tags=["Competitions"])


@router.get("/competitions", response_model=list[CompetitionRead])
def get_competitions(db: Session = Depends(get_db)):
    service = MatchService(db)
    return service.list_competitions()


@router.get("/seasons", response_model=list[SeasonRead])
def get_seasons(db: Session = Depends(get_db)):
    service = MatchService(db)
    return service.list_seasons()
