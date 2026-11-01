from datetime import date, datetime
from typing import Any, List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.football import PlayerRead


class ScoutingReportCreate(BaseModel):
    scout_name: Optional[str] = None
    position_assessed: Optional[str] = None
    technical_rating: Optional[float] = Field(None, ge=1.0, le=10.0)
    tactical_rating: Optional[float] = Field(None, ge=1.0, le=10.0)
    physical_rating: Optional[float] = Field(None, ge=1.0, le=10.0)
    mental_rating: Optional[float] = Field(None, ge=1.0, le=10.0)
    overall_rating: Optional[float] = Field(None, ge=1.0, le=10.0)
    strengths: Optional[List[str]] = None
    weaknesses: Optional[List[str]] = None
    written_observations: Optional[str] = None
    assessment_date: Optional[date] = None


class ScoutingReportRead(BaseModel):
    id: uuid.UUID
    player_id: Optional[uuid.UUID] = None
    scout_name: Optional[str] = None
    position_assessed: Optional[str] = None
    technical_rating: Optional[float] = None
    tactical_rating: Optional[float] = None
    physical_rating: Optional[float] = None
    mental_rating: Optional[float] = None
    overall_rating: Optional[float] = None
    strengths: Optional[Any] = None
    weaknesses: Optional[Any] = None
    written_observations: Optional[str] = None
    assessment_date: date
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ShortlistPlayerCreate(BaseModel):
    player_id: uuid.UUID
    notes: Optional[str] = None
    recruitment_status: str = "Target"


class ShortlistPlayerRead(BaseModel):
    id: uuid.UUID
    shortlist_id: uuid.UUID
    player_id: uuid.UUID
    added_date: datetime
    notes: Optional[str] = None
    recruitment_status: str
    player: Optional[PlayerRead] = None

    model_config = ConfigDict(from_attributes=True)


class ShortlistCreate(BaseModel):
    name: str
    description: Optional[str] = None
    owner: Optional[str] = None


class ShortlistRead(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str] = None
    owner: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    player_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class ShortlistDetail(ShortlistRead):
    players: List[ShortlistPlayerRead] = []
