import uuid
from datetime import datetime
from typing import Any, List, Optional
from sqlalchemy import Boolean, ForeignKey, Integer, String, Text, DateTime
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Club(Base):
    __tablename__ = "clubs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    linked_team_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("teams.id", ondelete="SET NULL"), nullable=True, index=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    manager_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    primary_formation: Mapped[str] = mapped_column(String(20), nullable=False, default="4-3-3")
    secondary_formation: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, default="4-2-3-1")
    playing_style: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    tactical_identity: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    linked_team = relationship("Team", foreign_keys=[linked_team_id])
    recruitment_needs: Mapped[List["RecruitmentNeed"]] = relationship(
        "RecruitmentNeed", back_populates="club", cascade="all, delete-orphan"
    )


class RecruitmentNeed(Base):
    __tablename__ = "recruitment_needs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    club_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clubs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    position: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    role_profile: Mapped[str] = mapped_column(String(100), nullable=False)
    priority: Mapped[str] = mapped_column(String(20), nullable=False, default="High")
    target_age_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    target_age_max: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    target_metrics: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="Active")
    rationale: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    shortlist_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("shortlists.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    club: Mapped["Club"] = relationship("Club", back_populates="recruitment_needs")
    shortlist = relationship("Shortlist")
