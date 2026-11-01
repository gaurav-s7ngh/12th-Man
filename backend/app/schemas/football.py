from datetime import date, datetime
from typing import Any, Dict, List, Optional
import uuid
from pydantic import BaseModel, ConfigDict


class TeamBase(BaseModel):
    id: uuid.UUID
    external_id: Optional[str] = None
    name: str
    country: Optional[str] = None
    gender: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TeamRead(TeamBase):
    pass


class PlayerBase(BaseModel):
    id: uuid.UUID
    external_id: Optional[str] = None
    name: str
    birth_date: Optional[date] = None
    nationality: Optional[str] = None
    preferred_foot: Optional[str] = None
    height: Optional[int] = None
    primary_position: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PlayerRead(PlayerBase):
    pass


class CompetitionRead(BaseModel):
    id: uuid.UUID
    external_id: Optional[str] = None
    name: str
    country: Optional[str] = None
    gender: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class SeasonRead(BaseModel):
    id: uuid.UUID
    external_id: Optional[str] = None
    competition_id: uuid.UUID
    name: str
    start_year: Optional[int] = None
    end_year: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class MatchRead(BaseModel):
    id: uuid.UUID
    external_id: Optional[str] = None
    competition_id: uuid.UUID
    season_id: uuid.UUID
    home_team_id: uuid.UUID
    away_team_id: uuid.UUID
    match_date: date
    match_datetime: Optional[datetime] = None
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    match_status: Optional[str] = None
    home_team: Optional[TeamRead] = None
    away_team: Optional[TeamRead] = None

    model_config = ConfigDict(from_attributes=True)


class MatchDetail(MatchRead):
    competition: Optional[CompetitionRead] = None
    season: Optional[SeasonRead] = None
    match_metadata: Optional[Dict[str, Any]] = None


class PlayerAppearanceRead(BaseModel):
    id: uuid.UUID
    match_id: uuid.UUID
    team_id: uuid.UUID
    is_starter: bool
    is_substitute: bool
    minutes_played: Optional[int] = None
    shirt_number: Optional[int] = None
    position: Optional[str] = None
    match: Optional[MatchRead] = None

    model_config = ConfigDict(from_attributes=True)


class PlayerMatchStatsRead(BaseModel):
    id: uuid.UUID
    match_id: uuid.UUID
    team_id: uuid.UUID
    minutes_played: int
    goals: int
    assists: int
    shots: int
    shots_on_target: int
    passes_attempted: int
    passes_completed: int
    key_passes: int
    tackles: int
    interceptions: int
    clearances: int
    fouls_committed: int
    fouls_won: int
    yellow_cards: int
    red_cards: int
    aerials_won: int
    dribbles_completed: int
    duels_won: int
    touches: int
    xg: Optional[float] = None
    xa: Optional[float] = None
    detailed_stats: Optional[Dict[str, Any]] = None
    match: Optional[MatchRead] = None

    model_config = ConfigDict(from_attributes=True)


class PlayerAggregatedStats(BaseModel):
    matches_played: int
    starts: int
    sub_appearances: int
    total_minutes: int
    goals: int
    assists: int
    shots: int
    shots_on_target: int
    passes_attempted: int
    passes_completed: int
    pass_completion_pct: float
    key_passes: int
    tackles: int
    interceptions: int
    clearances: int
    aerials_won: int
    dribbles_completed: int
    duels_won: int
    touches: int
    total_xg: float
    total_xa: float
    xg_per_90: float
    xa_per_90: float
    goals_per_90: float
    assists_per_90: float
    key_passes_per_90: float
    tackles_per_90: float
    interceptions_per_90: float


class PlayerDetail(PlayerRead):
    appearances_count: int = 0
    total_minutes: int = 0
    teams: List[TeamRead] = []
    aggregated_stats: Optional[PlayerAggregatedStats] = None


class TeamDetail(TeamRead):
    matches_count: int = 0
    players_count: int = 0
    players: List[PlayerRead] = []
