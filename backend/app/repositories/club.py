from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.club import Club, RecruitmentNeed
from app.models.football import PlayerAppearance, Team
from app.schemas.club import (
    AvailableClubItem,
    ClubCreate,
    ClubUpdate,
    RecruitmentNeedCreate,
    RecruitmentNeedUpdate,
)


BUNDESLIGA_TACTICAL_PROFILES: Dict[str, Dict[str, Any]] = {
    "leverkusen": {
        "manager": "Xabi Alonso",
        "formation": "3-4-2-1",
        "secondary_formation": "4-2-3-1",
        "style": {
            "possession_phase": "High Possession & Fluid Positional Rotations",
            "pressing_intensity": "Aggressive Counter-Press & High Line",
            "build_up_approach": "Short passing from back through double pivot",
            "attacking_width": "Inverted playmakers with overlapping wingbacks",
            "tempo": "Controlled High Tempo",
        },
        "tactical_identity": {
            "target_pressing_p90": 18.0,
            "min_progressive_pass_pct": 75.0,
            "preferred_age_bracket": [20, 27],
            "key_kpis": [
                "pass_completion_pct",
                "key_passes_per_90",
                "tackles_per_90",
                "interceptions_per_90",
                "dribbles_completed",
            ],
        },
        "needs": [
            ("Elite Ball-Winning Defensive Midfielder", "Midfielder", "Ball-Winning Destroyer", "Critical", 21, 27, "High-workrate anchor to shield the back three and dominate counter-pressing duels."),
            ("Dynamic Inverted Playmaker / Winger", "Forward", "Inverted Creator", "High", 19, 25, "Creative half-space operator capable of delivering decisive line-breaking passes."),
            ("Progressive Left-Sided Center Back", "Defender", "Ball-Playing Defender", "Medium", 20, 26, "Left-footed defender capable of initiating buildup play under pressure."),
        ],
    },
    "bayern": {
        "manager": "Thomas Tuchel",
        "formation": "4-2-3-1",
        "secondary_formation": "4-3-3",
        "style": {
            "possession_phase": "Dominant Possession & Positional Overloads",
            "pressing_intensity": "High Pressing & Immediate Counter-Press",
            "build_up_approach": "Build up through double pivot and inverted wingers",
            "attacking_width": "Wide wingers with overlapping fullbacks",
            "tempo": "Direct Buildup & Quick Overloads",
        },
        "tactical_identity": {
            "target_pressing_p90": 17.5,
            "min_progressive_pass_pct": 78.0,
            "preferred_age_bracket": [21, 28],
            "key_kpis": ["passes_completed_p90", "key_passes_p90", "shots_on_target_p90", "duels_won_p90"],
        },
        "needs": [
            ("Holding Defensive Midfielder (Holding 6)", "Midfielder", "Deep-Lying Playmaker", "Critical", 22, 28, "Disciplined positional pivot to dictate tempo and prevent counter-attack transitions."),
            ("Athletic Right Fullback", "Defender", "Attacking Wingback", "High", 20, 26, "Explosive wide defender to provide natural overlap and recovery pace in defensive transitions."),
            ("Clinical Box Striker Rotation", "Forward", "Clinical Poacher", "Medium", 21, 27, "Reliable penalty-box finisher for tactical rotation across domestic and European fixtures."),
        ],
    },
    "dortmund": {
        "manager": "Edin Terzic",
        "formation": "4-3-3",
        "secondary_formation": "4-2-3-1",
        "style": {
            "possession_phase": "Direct Vertical Attacks & Rapid Transitions",
            "pressing_intensity": "Mid-to-High Block Pressing",
            "build_up_approach": "Direct vertical progression into dynamic wingers",
            "attacking_width": "Direct 1v1 wing isolation",
            "tempo": "High Transition Speed",
        },
        "tactical_identity": {
            "target_pressing_p90": 16.5,
            "min_progressive_pass_pct": 72.0,
            "preferred_age_bracket": [19, 25],
            "key_kpis": ["dribbles_completed_p90", "key_passes_p90", "xg_p90", "tackles_p90"],
        },
        "needs": [
            ("Creative Central Midfielder (8/10 Hybrid)", "Midfielder", "Box-to-Box Engine", "Critical", 20, 25, "Dynamic link between defensive midfield and explosive front line."),
            ("Fast Transition Winger", "Forward", "Inverted Creator", "High", 18, 24, "Pacey 1v1 dribbler with high direct goal creation numbers."),
            ("Aggressive Sweeper Center Back", "Defender", "Ball-Playing Defender", "Medium", 21, 26, "Athletic center back with speed to defend large spaces in behind."),
        ],
    },
    "stuttgart": {
        "manager": "Sebastian Hoeness",
        "formation": "4-2-3-1",
        "secondary_formation": "3-4-2-1",
        "style": {
            "possession_phase": "Structured Positional Play & Half-Space Overloads",
            "pressing_intensity": "High-Intensity Synchronized Pressing",
            "build_up_approach": "Patient short passing with dynamic third-man runs",
            "attacking_width": "Inverted wide attackers with overlapping fullbacks",
            "tempo": "Dynamic Positional Fluidity",
        },
        "tactical_identity": {
            "target_pressing_p90": 17.0,
            "min_progressive_pass_pct": 74.0,
            "preferred_age_bracket": [20, 26],
            "key_kpis": ["pass_completion_pct", "key_passes_p90", "xg_p90", "tackles_p90"],
        },
        "needs": [
            ("Lethal Center Forward", "Forward", "Clinical Poacher", "Critical", 21, 27, "High-conversion forward to sustain goal production and link attacks."),
            ("Press-Resistant Central Midfielder", "Midfielder", "Box-to-Box Engine", "High", 20, 25, "Composed midfield operator capable of evading opponent press."),
            ("Modern Attacking Left Back", "Defender", "Attacking Wingback", "Medium", 19, 25, "Progressive carrier and crosser from deep wide positions."),
        ],
    },
    "leipzig": {
        "manager": "Marco Rose",
        "formation": "4-2-2-2",
        "secondary_formation": "4-4-2",
        "style": {
            "possession_phase": "Central Hyper-Verticality & Rapid Breakaways",
            "pressing_intensity": "Furious High Press & Ball-Oriented Swarming",
            "build_up_approach": "Direct central penetration through attacking duos",
            "attacking_width": "Narrow attacking width with bombing fullbacks",
            "tempo": "Maximum Transition Velocity",
        },
        "tactical_identity": {
            "target_pressing_p90": 19.0,
            "min_progressive_pass_pct": 70.0,
            "preferred_age_bracket": [18, 24],
            "key_kpis": ["tackles_p90", "dribbles_completed_p90", "xg_p90", "touches_p90"],
        },
        "needs": [
            ("High-Intensity Ball-Winner", "Midfielder", "Ball-Winning Destroyer", "Critical", 19, 24, "Relentless central presser to trigger instant transition counter-attacks."),
            ("Versatile Dynamic Forward", "Forward", "Inverted Creator", "High", 19, 24, "Multi-functional forward capable of pressing and high-speed box entries."),
            ("Athletic Dual-Channel Fullback", "Defender", "Attacking Wingback", "Medium", 19, 23, "High-stamina runner providing vertical width."),
        ],
    },
}


def _get_profile_for_team_name(team_name: str) -> Dict[str, Any]:
    lower = team_name.lower()
    for key, prof in BUNDESLIGA_TACTICAL_PROFILES.items():
        if key in lower:
            return prof

    # Generic realistic Bundesliga fallback
    return {
        "manager": f"Head Coach ({team_name})",
        "formation": "4-2-3-1",
        "secondary_formation": "4-3-3",
        "style": {
            "possession_phase": "Structured Positional Balance & Transition Focus",
            "pressing_intensity": "Disciplined Mid-to-High Pressing",
            "build_up_approach": "Direct progression through midfield lines",
            "attacking_width": "Balanced flank combinations",
            "tempo": "High German Bundesliga Intensity",
        },
        "tactical_identity": {
            "target_pressing_p90": 16.0,
            "min_progressive_pass_pct": 70.0,
            "preferred_age_bracket": [20, 27],
            "key_kpis": ["pass_completion_pct", "tackles_p90", "key_passes_p90", "duels_won_p90"],
        },
        "needs": [
            ("Dynamic Box-to-Box Midfielder", "Midfielder", "Box-to-Box Engine", "Critical", 21, 27, "High-workrate engine to dominate central transitions."),
            ("Reliable Central Defender", "Defender", "Ball-Playing Defender", "High", 21, 28, "Resolute aerial and ground defender for set-piece and box defense."),
            ("Creative Wide Attacker", "Forward", "Inverted Creator", "Medium", 19, 26, "Direct dribbler to provide spark in final third."),
        ],
    }


class ClubRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_active_club(self) -> Club:
        club = self.db.execute(
            select(Club)
            .options(
                joinedload(Club.linked_team),
                selectinload(Club.recruitment_needs),
            )
            .where(Club.is_active.is_(True))
        ).scalars().first()

        if club:
            return club

        # Check if any club exists; make first one active
        club = self.db.execute(
            select(Club)
            .options(
                joinedload(Club.linked_team),
                selectinload(Club.recruitment_needs),
            )
            .order_by(Club.created_at.asc())
        ).scalars().first()

        if club:
            club.is_active = True
            self.db.commit()
            self.db.refresh(club)
            return club

        # Otherwise initialize default club
        return self.ensure_default_club()

    def get_club(self) -> Optional[Club]:
        return self.get_active_club()

    def get_by_id(self, club_id: uuid.UUID) -> Optional[Club]:
        return self.db.execute(
            select(Club)
            .options(
                joinedload(Club.linked_team),
                selectinload(Club.recruitment_needs),
            )
            .where(Club.id == club_id)
        ).scalar_one_or_none()

    def get_by_team_id(self, team_id: uuid.UUID) -> Optional[Club]:
        return self.db.execute(
            select(Club)
            .options(
                joinedload(Club.linked_team),
                selectinload(Club.recruitment_needs),
            )
            .where(Club.linked_team_id == team_id)
        ).scalars().first()

    def set_active_club(self, club_id: uuid.UUID) -> Optional[Club]:
        target = self.get_by_id(club_id)
        if not target:
            return None

        # Deactivate all clubs
        all_clubs = self.db.execute(select(Club)).scalars().all()
        for c in all_clubs:
            c.is_active = (c.id == club_id)

        self.db.commit()
        self.db.refresh(target)
        return target

    def get_or_create_club_for_team(self, team_id: uuid.UUID) -> Club:
        existing = self.get_by_team_id(team_id)
        if existing:
            return existing

        team = self.db.execute(select(Team).where(Team.id == team_id)).scalar_one_or_none()
        if not team:
            raise ValueError(f"Team {team_id} does not exist.")

        profile = _get_profile_for_team_name(team.name)
        club = Club(
            name=team.name,
            linked_team_id=team.id,
            manager_name=profile["manager"],
            primary_formation=profile["formation"],
            secondary_formation=profile["secondary_formation"],
            playing_style=profile["style"],
            tactical_identity=profile["tactical_identity"],
            is_active=False,
        )
        self.db.add(club)
        self.db.commit()
        self.db.refresh(club)

        # Seed initial realistic recruitment needs
        for title, pos, role, prio, min_age, max_age, rationale in profile["needs"]:
            need = RecruitmentNeed(
                club_id=club.id,
                title=title,
                position=pos,
                role_profile=role,
                priority=prio,
                target_age_min=min_age,
                target_age_max=max_age,
                target_metrics={},
                rationale=rationale,
                status="Active",
            )
            self.db.add(need)

        self.db.commit()
        self.db.refresh(club)
        return club

    def list_available_clubs(self) -> List[AvailableClubItem]:
        teams = list(self.db.execute(select(Team).order_by(Team.name.asc())).scalars().all())
        clubs = list(self.db.execute(select(Club)).scalars().all())
        clubs_by_team_id = {c.linked_team_id: c for c in clubs if c.linked_team_id}

        # Squad sizes by team
        app_counts = dict(
            self.db.execute(
                select(
                    PlayerAppearance.team_id,
                    func.count(func.distinct(PlayerAppearance.player_id)),
                ).group_by(PlayerAppearance.team_id)
            ).all()
        )

        items: List[AvailableClubItem] = []
        for team in teams:
            club = clubs_by_team_id.get(team.id)
            profile = _get_profile_for_team_name(team.name)
            squad_size = app_counts.get(team.id, 0)

            items.append(
                AvailableClubItem(
                    id=club.id if club else None,
                    team_id=team.id,
                    name=team.name,
                    manager_name=club.manager_name if club else profile["manager"],
                    primary_formation=club.primary_formation if club else profile["formation"],
                    is_active=club.is_active if club else False,
                    squad_size=squad_size,
                )
            )

        return items

    def create_club(self, data: ClubCreate) -> Club:
        club = Club(
            name=data.name,
            linked_team_id=data.linked_team_id,
            manager_name=data.manager_name,
            primary_formation=data.primary_formation,
            secondary_formation=data.secondary_formation,
            playing_style=data.playing_style,
            tactical_identity=data.tactical_identity,
            is_active=data.is_active,
        )
        self.db.add(club)
        self.db.commit()
        self.db.refresh(club)
        return club

    def update_club(self, club_id: uuid.UUID, data: ClubUpdate) -> Optional[Club]:
        club = self.get_by_id(club_id)
        if not club:
            return None

        update_dict = data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            setattr(club, key, value)

        club.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(club)
        return club

    def ensure_default_club(self) -> Club:
        leverkusen = self.db.execute(
            select(Team).where(Team.name.ilike("%Leverkusen%"))
        ).scalars().first()

        existing = None
        if leverkusen:
            existing = self.get_by_team_id(leverkusen.id)

        if not existing:
            existing = self.db.execute(
                select(Club)
                .options(
                    joinedload(Club.linked_team),
                    selectinload(Club.recruitment_needs),
                )
                .order_by(Club.created_at.asc())
            ).scalars().first()

        if existing:
            if not existing.is_active:
                existing.is_active = True
                self.db.commit()
                self.db.refresh(existing)
            return existing

        profile = _get_profile_for_team_name("Bayer Leverkusen")
        club = Club(
            name="Bayer 04 Leverkusen" if leverkusen else "12th Man Football Club",
            linked_team_id=leverkusen.id if leverkusen else None,
            manager_name=profile["manager"],
            primary_formation=profile["formation"],
            secondary_formation=profile["secondary_formation"],
            playing_style=profile["style"],
            tactical_identity=profile["tactical_identity"],
            is_active=True,
        )
        self.db.add(club)
        self.db.commit()
        self.db.refresh(club)

        for title, pos, role, prio, min_age, max_age, rationale in profile["needs"]:
            need = RecruitmentNeed(
                club_id=club.id,
                title=title,
                position=pos,
                role_profile=role,
                priority=prio,
                target_age_min=min_age,
                target_age_max=max_age,
                target_metrics={},
                rationale=rationale,
                status="Active",
            )
            self.db.add(need)

        self.db.commit()
        self.db.refresh(club)
        return club

    def list_recruitment_needs(self, club_id: uuid.UUID) -> List[RecruitmentNeed]:
        return list(self.db.execute(
            select(RecruitmentNeed)
            .where(RecruitmentNeed.club_id == club_id)
            .order_by(
                RecruitmentNeed.priority.desc(),
                RecruitmentNeed.created_at.desc(),
            )
        ).scalars().all())

    def get_recruitment_need(self, need_id: uuid.UUID) -> Optional[RecruitmentNeed]:
        return self.db.execute(
            select(RecruitmentNeed).where(RecruitmentNeed.id == need_id)
        ).scalar_one_or_none()

    def create_recruitment_need(self, club_id: uuid.UUID, data: RecruitmentNeedCreate) -> RecruitmentNeed:
        need = RecruitmentNeed(
            club_id=club_id,
            title=data.title,
            position=data.position,
            role_profile=data.role_profile,
            priority=data.priority,
            target_age_min=data.target_age_min,
            target_age_max=data.target_age_max,
            target_metrics=data.target_metrics,
            status=data.status,
            rationale=data.rationale,
            shortlist_id=data.shortlist_id,
        )
        self.db.add(need)
        self.db.commit()
        self.db.refresh(need)
        return need

    def update_recruitment_need(
        self, need_id: uuid.UUID, data: RecruitmentNeedUpdate
    ) -> Optional[RecruitmentNeed]:
        need = self.get_recruitment_need(need_id)
        if not need:
            return None

        update_dict = data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            setattr(need, key, value)

        need.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(need)
        return need

    def delete_recruitment_need(self, need_id: uuid.UUID) -> bool:
        need = self.get_recruitment_need(need_id)
        if not need:
            return False
        self.db.delete(need)
        self.db.commit()
        return True
