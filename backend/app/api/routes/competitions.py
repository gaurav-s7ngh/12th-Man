from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.football import CompetitionRead
from app.services.match_service import MatchService

router = APIRouter(prefix="/competitions", tags=["Competitions"])


@router.get("", response_model=list[CompetitionRead])
def get_competitions(db: Session = Depends(get_db)):
    service = MatchService(db)
    return service.list_competitions()
