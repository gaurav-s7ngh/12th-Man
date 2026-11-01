import uuid
from datetime import date, datetime
from typing import Any, List, Optional

from sqlalchemy import (
    Date,
    DateTime,
    Float,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ScoutingReport(Base):
    __tablename__ = "scouting_reports"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    player_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("players.id", ondelete="SET NULL"), nullable=True, index=True
    )
    scout_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    position_assessed: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    technical_rating: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    tactical_rating: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    physical_rating: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    mental_rating: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    overall_rating: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    strengths: Mapped[Optional[Any]] = mapped_column(JSONB, nullable=True)
    weaknesses: Mapped[Optional[Any]] = mapped_column(JSONB, nullable=True)
    written_observations: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    assessment_date: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    player: Mapped["Player"] = relationship("Player", back_populates="scouting_reports")  # type: ignore


class Shortlist(Base):
    __tablename__ = "shortlists"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    owner: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    players: Mapped[List["ShortlistPlayer"]] = relationship(
        "ShortlistPlayer", back_populates="shortlist", cascade="all, delete-orphan"
    )


class ShortlistPlayer(Base):
    __tablename__ = "shortlist_players"
    __table_args__ = (
        UniqueConstraint("shortlist_id", "player_id", name="uq_shortlist_player"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    shortlist_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("shortlists.id", ondelete="CASCADE"), nullable=False, index=True
    )
    player_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("players.id", ondelete="SET NULL"), nullable=True, index=True
    )
    added_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    recruitment_status: Mapped[str] = mapped_column(
        String(50), default="Target", nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    shortlist: Mapped["Shortlist"] = relationship("Shortlist", back_populates="players")
    player: Mapped["Player"] = relationship("Player", back_populates="shortlist_entries")  # type: ignore
