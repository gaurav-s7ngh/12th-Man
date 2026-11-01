from typing import Any, Dict, List, Optional
import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.ml_service import MLService
from app.services.squad_service import SquadService

router = APIRouter(prefix="/ml", tags=["Machine Learning & Tactical Analytics"])


@router.get("/similar/{player_id}")
def get_similar_players(
    player_id: uuid.UUID,
    k: int = Query(6, ge=1, le=20, description="Number of similar players to find"),
    db: Session = Depends(get_db),
) -> List[Dict[str, Any]]:
    service = MLService(db)
    return service.get_similar_players(player_id, k=k)


@router.get("/archetypes")
def get_archetypes(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    service = MLService(db)
    return service.get_archetypes()


@router.get("/archetype/{player_id}")
def get_player_archetype(
    player_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> Optional[Dict[str, Any]]:
    service = MLService(db)
    return service.get_player_archetype(player_id)


@router.get("/squad-gaps")
def get_squad_archetype_gaps(
    team_id: Optional[uuid.UUID] = Query(None, description="Optional team UUID; defaults to club's linked team"),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    squad_service = SquadService(db)
    club = squad_service.get_or_create_club()
    target_team_id = team_id or club.linked_team_id
    if not target_team_id:
        return {"error": "No linked team for squad archetype analysis."}

    service = MLService(db)
    return service.analyze_squad_archetype_gaps(target_team_id)
