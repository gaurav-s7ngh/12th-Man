import uuid
from datetime import date, datetime
from typing import Any, List, Optional

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class DataSource(Base):
    __tablename__ = "data_sources"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    provider_name: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    dataset_identifier: Mapped[str] = mapped_column(String(100), nullable=False)
    import_timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="completed")
    source_provenance: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    records_ingested: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )


class Competition(Base):
    __tablename__ = "competitions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    external_id: Mapped[Optional[str]] = mapped_column(
        String(100), unique=True, index=True, nullable=True
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    country: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    gender: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    seasons: Mapped[List["Season"]] = relationship("Season", back_populates="competition", cascade="all, delete-orphan")
    matches: Mapped[List["Match"]] = relationship("Match", back_populates="competition")


class Season(Base):
    __tablename__ = "seasons"
    __table_args__ = (
        UniqueConstraint("competition_id", "name", name="uq_competition_season_name"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    external_id: Mapped[Optional[str]] = mapped_column(
        String(100), index=True, nullable=True
    )
    competition_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("competitions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    start_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    end_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    competition: Mapped["Competition"] = relationship("Competition", back_populates="seasons")
    matches: Mapped[List["Match"]] = relationship("Match", back_populates="season")


class Team(Base):
    __tablename__ = "teams"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    external_id: Mapped[Optional[str]] = mapped_column(
        String(100), unique=True, index=True, nullable=True
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    country: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    gender: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    home_matches: Mapped[List["Match"]] = relationship(
        "Match", foreign_keys="Match.home_team_id", back_populates="home_team"
    )
    away_matches: Mapped[List["Match"]] = relationship(
        "Match", foreign_keys="Match.away_team_id", back_populates="away_team"
    )
    appearances: Mapped[List["PlayerAppearance"]] = relationship("PlayerAppearance", back_populates="team")
    match_stats: Mapped[List["PlayerMatchStats"]] = relationship("PlayerMatchStats", back_populates="team")


class Player(Base):
    __tablename__ = "players"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    external_id: Mapped[Optional[str]] = mapped_column(
        String(100), unique=True, index=True, nullable=True
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    birth_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    nationality: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    preferred_foot: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    height: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # in centimeters
    primary_position: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    appearances: Mapped[List["PlayerAppearance"]] = relationship(
        "PlayerAppearance", back_populates="player", cascade="all, delete-orphan"
    )
    match_events: Mapped[List["MatchEvent"]] = relationship("MatchEvent", back_populates="player")
    match_stats: Mapped[List["PlayerMatchStats"]] = relationship(
        "PlayerMatchStats", back_populates="player", cascade="all, delete-orphan"
    )
    scouting_reports: Mapped[List["ScoutingReport"]] = relationship(
        "ScoutingReport", back_populates="player", cascade="all, delete-orphan"
    )
    shortlist_entries: Mapped[List["ShortlistPlayer"]] = relationship(
        "ShortlistPlayer", back_populates="player", cascade="all, delete-orphan"
    )


class Match(Base):
    __tablename__ = "matches"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    external_id: Mapped[Optional[str]] = mapped_column(
        String(100), unique=True, index=True, nullable=True
    )
    competition_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("competitions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    season_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("seasons.id", ondelete="CASCADE"), nullable=False, index=True
    )
    home_team_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("teams.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    away_team_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("teams.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    match_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    match_datetime: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    home_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    away_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    match_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    match_metadata: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    competition: Mapped["Competition"] = relationship("Competition", back_populates="matches")
    season: Mapped["Season"] = relationship("Season", back_populates="matches")
    home_team: Mapped["Team"] = relationship("Team", foreign_keys=[home_team_id], back_populates="home_matches")
    away_team: Mapped["Team"] = relationship("Team", foreign_keys=[away_team_id], back_populates="away_matches")
    appearances: Mapped[List["PlayerAppearance"]] = relationship(
        "PlayerAppearance", back_populates="match", cascade="all, delete-orphan"
    )
    events: Mapped[List["MatchEvent"]] = relationship(
        "MatchEvent", back_populates="match", cascade="all, delete-orphan"
    )
    stats: Mapped[List["PlayerMatchStats"]] = relationship(
        "PlayerMatchStats", back_populates="match", cascade="all, delete-orphan"
    )


class PlayerAppearance(Base):
    __tablename__ = "player_appearances"
    __table_args__ = (
        UniqueConstraint("player_id", "match_id", "team_id", name="uq_player_match_team_appearance"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    player_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("players.id", ondelete="CASCADE"), nullable=False, index=True
    )
    match_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("matches.id", ondelete="CASCADE"), nullable=False, index=True
    )
    team_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("teams.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    is_starter: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_substitute: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    minutes_played: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    shirt_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    position: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    external_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    player: Mapped["Player"] = relationship("Player", back_populates="appearances")
    match: Mapped["Match"] = relationship("Match", back_populates="appearances")
    team: Mapped["Team"] = relationship("Team", back_populates="appearances")


class MatchEvent(Base):
    __tablename__ = "match_events"
    __table_args__ = (
        Index("ix_match_events_match_event_type", "match_id", "event_type"),
        Index("ix_match_events_player_event_type", "player_id", "event_type"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    external_id: Mapped[str] = mapped_column(
        String(100), unique=True, index=True, nullable=False
    )
    match_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("matches.id", ondelete="CASCADE"), nullable=False, index=True
    )
    player_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("players.id", ondelete="SET NULL"), nullable=True, index=True
    )
    team_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("teams.id", ondelete="SET NULL"), nullable=True, index=True
    )
    event_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    period: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    timestamp: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    minute: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)
    second: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    location_x: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    location_y: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    attributes: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    raw_payload: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    # Relationships
    match: Mapped["Match"] = relationship("Match", back_populates="events")
    player: Mapped[Optional["Player"]] = relationship("Player", back_populates="match_events")
    team: Mapped[Optional["Team"]] = relationship("Team")


class PlayerMatchStats(Base):
    __tablename__ = "player_match_stats"
    __table_args__ = (
        UniqueConstraint("player_id", "match_id", name="uq_player_match_stats"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    player_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("players.id", ondelete="CASCADE"), nullable=False, index=True
    )
    match_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("matches.id", ondelete="CASCADE"), nullable=False, index=True
    )
    team_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("teams.id", ondelete="RESTRICT"), nullable=False, index=True
    )

    # Standard metrics
    minutes_played: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    goals: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    assists: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    shots: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    shots_on_target: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    passes_attempted: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    passes_completed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    key_passes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    tackles: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    interceptions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    clearances: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    fouls_committed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    fouls_won: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    yellow_cards: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    red_cards: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    aerials_won: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    dribbles_completed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    duels_won: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    touches: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    xg: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    xa: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    detailed_stats: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    player: Mapped["Player"] = relationship("Player", back_populates="match_stats")
    match: Mapped["Match"] = relationship("Match", back_populates="stats")
    team: Mapped["Team"] = relationship("Team", back_populates="match_stats")
