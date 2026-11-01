from typing import Any, Dict, List, Optional
import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.recruitment_service import RecruitmentService

router = APIRouter(prefix="/recruitment", tags=["Recruitment Intelligence"])


@router.get("/roles")
def get_supported_roles(db: Session = Depends(get_db)) -> Dict[str, Any]:
    service = RecruitmentService(db)
    return service.get_role_specs()


@router.get("/discover")
def discover_candidates(
    role_profile: str = Query("Ball-Winning Destroyer", description="Target tactical role"),
    position: Optional[str] = Query(None, description="Optional position group filter (e.g. CM, CB, Forward)"),
    preferred_foot: Optional[str] = Query(None, description="Optional preferred foot filter (Right, Left, Both)"),
    min_age: Optional[int] = Query(None, ge=14, le=45, description="Minimum age threshold"),
    max_age: Optional[int] = Query(None, ge=14, le=45, description="Maximum age ceiling"),
    competition_id: Optional[uuid.UUID] = Query(None, description="Optional competition filter"),
    season_id: Optional[uuid.UUID] = Query(None, description="Optional season filter"),
    min_minutes: int = Query(90, ge=45, description="Minimum minutes threshold for confidence"),
    min_fit_score: float = Query(40.0, ge=0.0, le=100.0, description="Minimum fit score threshold"),
    limit: int = Query(25, ge=1, le=100, description="Max candidates to return"),
    db: Session = Depends(get_db),
) -> List[Dict[str, Any]]:
    service = RecruitmentService(db)
    return service.discover_candidates(
        role_profile=role_profile,
        position=position,
        preferred_foot=preferred_foot,
        min_age=min_age,
        max_age=max_age,
        competition_id=competition_id,
        season_id=season_id,
        min_minutes=min_minutes,
        min_fit_score=min_fit_score,
        limit=limit,
    )


@router.get("/map")
def get_recruitment_map(
    role_profile: str = Query("Box-to-Box Engine", description="Target tactical role profile"),
    need_id: Optional[uuid.UUID] = Query(None, description="Optional specific recruitment need ID"),
    club_id: Optional[uuid.UUID] = Query(None, description="Optional club UUID to evaluate complementarity against"),
    position: Optional[str] = Query(None, description="Optional position group filter"),
    preferred_foot: Optional[str] = Query(None, description="Optional preferred foot filter"),
    min_age: Optional[int] = Query(None, ge=14, le=45, description="Minimum age filter"),
    max_age: Optional[int] = Query(None, ge=14, le=45, description="Maximum age ceiling"),
    min_minutes: int = Query(90, ge=45, description="Minimum minutes filter"),
    competition_id: Optional[uuid.UUID] = Query(None, description="Optional competition filter"),
    season_id: Optional[uuid.UUID] = Query(None, description="Optional season filter"),
    limit: int = Query(60, ge=5, le=150, description="Max candidates to plot on matrix"),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    service = RecruitmentService(db)
    return service.get_recruitment_map(
        role_profile=role_profile,
        need_id=need_id,
        club_id=club_id,
        position=position,
        preferred_foot=preferred_foot,
        min_age=min_age,
        max_age=max_age,
        min_minutes=min_minutes,
        competition_id=competition_id,
        season_id=season_id,
        limit=limit,
    )
