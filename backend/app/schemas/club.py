from datetime import date, datetime
from typing import Any, Dict, List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.football import TeamRead


class ClubBase(BaseModel):
    name: str = Field(..., max_length=150)
    linked_team_id: Optional[uuid.UUID] = None
    is_active: bool = False
    manager_name: Optional[str] = Field(None, max_length=100)
    primary_formation: str = Field("4-3-3", max_length=20)
    secondary_formation: Optional[str] = Field("4-2-3-1", max_length=20)
    playing_style: Dict[str, Any] = Field(default_factory=dict)
    tactical_identity: Dict[str, Any] = Field(default_factory=dict)


class ClubCreate(ClubBase):
    pass


class ClubUpdate(BaseModel):
    name: Optional[str] = None
    linked_team_id: Optional[uuid.UUID] = None
    is_active: Optional[bool] = None
    manager_name: Optional[str] = None
    primary_formation: Optional[str] = None
    secondary_formation: Optional[str] = None
    playing_style: Optional[Dict[str, Any]] = None
    tactical_identity: Optional[Dict[str, Any]] = None


class AvailableClubItem(BaseModel):
    id: Optional[uuid.UUID] = None
    team_id: Optional[uuid.UUID] = None
    name: str
    manager_name: Optional[str] = None
    primary_formation: str = "4-3-3"
    is_active: bool = False
    squad_size: int = 0
    model_config = ConfigDict(from_attributes=True)


class RecruitmentNeedBase(BaseModel):
    title: str = Field(..., max_length=150)
    position: str = Field(..., max_length=50)
    role_profile: str = Field(..., max_length=100)
    priority: str = Field("High", max_length=20)
    target_age_min: Optional[int] = None
    target_age_max: Optional[int] = None
    target_metrics: Dict[str, Any] = Field(default_factory=dict)
    status: str = Field("Active", max_length=30)
    rationale: Optional[str] = None
    shortlist_id: Optional[uuid.UUID] = None


class RecruitmentNeedCreate(RecruitmentNeedBase):
    pass


class RecruitmentNeedUpdate(BaseModel):
    title: Optional[str] = None
    position: Optional[str] = None
    role_profile: Optional[str] = None
    priority: Optional[str] = None
    target_age_min: Optional[int] = None
    target_age_max: Optional[int] = None
    target_metrics: Optional[Dict[str, Any]] = None
    status: Optional[str] = None
    rationale: Optional[str] = None
    shortlist_id: Optional[uuid.UUID] = None


class RecruitmentNeedRead(RecruitmentNeedBase):
    id: uuid.UUID
    club_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ClubRead(ClubBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    linked_team: Optional[TeamRead] = None
    recruitment_needs: List[RecruitmentNeedRead] = []

    model_config = ConfigDict(from_attributes=True)


class SquadPlayerProfile(BaseModel):
    id: uuid.UUID
    name: str
    primary_position: Optional[str] = None
    birth_date: Optional[date] = None
    age: Optional[int] = None
    nationality: Optional[str] = None
    total_minutes: int = 0
    starts: int = 0
    sub_appearances: int = 0
    goals: int = 0
    assists: int = 0
    xg: float = 0.0
    sample_confidence: str = "Insufficient"
    tactical_archetype: Optional[str] = None


class PositionDepthItem(BaseModel):
    category: str
    target_slots: int
    current_count: int
    status: str  # Adequate, Thin, Critical Void, Surplus
    players: List[SquadPlayerProfile]


class SquadAssessmentRead(BaseModel):
    club_id: uuid.UUID
    club_name: str
    linked_team_name: Optional[str] = None
    total_squad_size: int
    average_age: float
    depth_categories: List[PositionDepthItem]
    strengths: List[str]
    vulnerabilities: List[str]
    recommended_recruitment_gaps: List[Dict[str, Any]]
