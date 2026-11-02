from collections import defaultdict
from datetime import date
from typing import Any, Dict, List, Optional
import uuid
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.club import Club, RecruitmentNeed
from app.models.football import Player, PlayerAppearance, PlayerMatchStats, Team
from app.repositories.club import ClubRepository
from app.schemas.club import (
    AvailableClubItem,
    ClubCreate,
    ClubRead,
    ClubUpdate,
    PositionDepthItem,
    RecruitmentNeedCreate,
    RecruitmentNeedRead,
    RecruitmentNeedUpdate,
    SquadAssessmentRead,
    SquadPlayerProfile,
)


class SquadService:
    def __init__(self, db: Session):
        self.db = db
        self.club_repo = ClubRepository(db)

    def get_or_create_club(self, club_id: Optional[uuid.UUID] = None) -> ClubRead:
        if club_id:
            club = self.club_repo.get_by_id(club_id)
            if not club:
                club = self.club_repo.get_active_club()
        else:
            club = self.club_repo.get_active_club()
        return ClubRead.model_validate(club)

    def list_available_clubs(self) -> List[AvailableClubItem]:
        return self.club_repo.list_available_clubs()

    def select_active_club(self, target_id: uuid.UUID) -> ClubRead:
        # Check if target_id is a Club
        club = self.club_repo.get_by_id(target_id)
        if club:
            activated = self.club_repo.set_active_club(club.id)
            return ClubRead.model_validate(activated or club)

        # Check if target_id is a Team
        team = self.db.execute(select(Team).where(Team.id == target_id)).scalar_one_or_none()
        if team:
            club = self.club_repo.get_or_create_club_for_team(team.id)
            activated = self.club_repo.set_active_club(club.id)
            return ClubRead.model_validate(activated or club)

        raise ValueError(f"Club or Team with ID {target_id} not found.")

    def update_club(self, club_id: uuid.UUID, data: ClubUpdate) -> Optional[ClubRead]:
        club = self.club_repo.update_club(club_id, data)
        return ClubRead.model_validate(club) if club else None

    def list_recruitment_needs(self, club_id: Optional[uuid.UUID] = None) -> List[RecruitmentNeedRead]:
        if not club_id:
            club = self.club_repo.get_active_club()
            target_club_id = club.id
        else:
            target_club_id = club_id
        needs = self.club_repo.list_recruitment_needs(target_club_id)
        return [RecruitmentNeedRead.model_validate(n) for n in needs]

    def create_recruitment_need(
        self, club_id: uuid.UUID, data: RecruitmentNeedCreate
    ) -> RecruitmentNeedRead:
        need = self.club_repo.create_recruitment_need(club_id, data)
        return RecruitmentNeedRead.model_validate(need)

    def update_recruitment_need(
        self, need_id: uuid.UUID, data: RecruitmentNeedUpdate
    ) -> Optional[RecruitmentNeedRead]:
        need = self.club_repo.update_recruitment_need(need_id, data)
        return RecruitmentNeedRead.model_validate(need) if need else None

    def delete_recruitment_need(self, need_id: uuid.UUID) -> bool:
        return self.club_repo.delete_recruitment_need(need_id)

    def assess_squad(
        self,
        club_id: Optional[uuid.UUID] = None,
        team_id: Optional[uuid.UUID] = None,
    ) -> SquadAssessmentRead:
        if club_id:
            club = self.club_repo.get_by_id(club_id)
        elif team_id:
            club = self.club_repo.get_or_create_club_for_team(team_id)
        else:
            club = self.club_repo.get_active_club()

        if not club:
            raise ValueError("No club configured.")

        target_team_id = team_id or club.linked_team_id
        if not target_team_id:
            # Match team by club name
            first_word = club.name.split()[0] if club.name else ""
            matched_team = self.db.execute(
                select(Team).where(Team.name.ilike(f"%{first_word}%"))
            ).scalars().first()
            if matched_team:
                target_team_id = matched_team.id
                club.linked_team_id = target_team_id
                self.db.commit()

        # Query all players appearing for this team
        appearances = self.db.execute(
            select(PlayerAppearance)
            .where(PlayerAppearance.team_id == target_team_id)
        ).scalars().all()

        player_ids = list({a.player_id for a in appearances})
        if not player_ids:
            return SquadAssessmentRead(
                club_id=club.id,
                club_name=club.name,
                linked_team_name="Unlinked",
                total_squad_size=0,
                average_age=0.0,
                depth_categories=[],
                strengths=["Squad setup in progress"],
                vulnerabilities=["No squad data currently linked"],
                recommended_recruitment_gaps=[],
            )

        players = self.db.execute(
            select(Player).where(Player.id.in_(player_ids))
        ).scalars().all()
        players_by_id = {p.id: p for p in players}

        # Match stats aggregated per player for this team
        match_stats = self.db.execute(
            select(PlayerMatchStats).where(
                PlayerMatchStats.team_id == target_team_id,
                PlayerMatchStats.player_id.in_(player_ids),
            )
        ).scalars().all()

        stats_by_player = defaultdict(list)
        for s in match_stats:
            stats_by_player[s.player_id].append(s)

        apps_by_player = defaultdict(list)
        for a in appearances:
            apps_by_player[a.player_id].append(a)

        profiles: List[SquadPlayerProfile] = []
        ages: List[int] = []

        today = date.today()

        for p_id, p in players_by_id.items():
            p_apps = apps_by_player[p_id]
            p_stats = stats_by_player[p_id]

            total_mins = sum(s.minutes_played for s in p_stats)
            starts = sum(1 for a in p_apps if a.is_starter)
            subs = sum(1 for a in p_apps if a.is_substitute)
            goals = sum(s.goals for s in p_stats)
            assists = sum(s.assists for s in p_stats)
            total_xg = round(sum(s.xg or 0.0 for s in p_stats), 2)

            age = None
            if p.birth_date:
                age = today.year - p.birth_date.year - (
                    (today.month, today.day) < (p.birth_date.month, p.birth_date.day)
                )
                ages.append(age)

            confidence = (
                "Sufficient (>270 mins)"
                if total_mins >= 270
                else "Limited Sample (90-269 mins)"
                if total_mins >= 90
                else "Insufficient (<90 mins)"
            )

            # Assign best position category
            profiles.append(
                SquadPlayerProfile(
                    id=p.id,
                    name=p.name,
                    primary_position=p.primary_position or "Unassigned",
                    birth_date=p.birth_date,
                    age=age,
                    nationality=p.nationality,
                    total_minutes=total_mins,
                    starts=starts,
                    sub_appearances=subs,
                    goals=goals,
                    assists=assists,
                    xg=total_xg,
                    sample_confidence=confidence,
                )
            )

        avg_age = round(sum(ages) / len(ages), 1) if ages else 0.0

        # Categorize into 6 core zones
        categories_def = {
            "Goalkeepers": {
                "target": 3,
                "keywords": ["Goalkeeper"],
            },
            "Central Defenders": {
                "target": 5,
                "keywords": ["Center Back", "Left Center Back", "Right Center Back"],
            },
            "Fullbacks / Wingbacks": {
                "target": 4,
                "keywords": ["Left Back", "Right Back", "Left Wing Back", "Right Wing Back"],
            },
            "Central & Defensive Midfield": {
                "target": 5,
                "keywords": [
                    "Defensive Midfield",
                    "Center Defensive Midfield",
                    "Left Defensive Midfield",
                    "Right Defensive Midfield",
                    "Center Midfield",
                    "Left Center Midfield",
                    "Right Center Midfield",
                    "Left Midfield",
                    "Right Midfield",
                ],
            },
            "Attacking Midfield & Wingers": {
                "target": 4,
                "keywords": [
                    "Center Attacking Midfield",
                    "Left Attacking Midfield",
                    "Right Attacking Midfield",
                    "Left Wing",
                    "Right Wing",
                ],
            },
            "Center Forwards": {
                "target": 3,
                "keywords": [
                    "Center Forward",
                    "Left Center Forward",
                    "Right Center Forward",
                    "Secondary Striker",
                ],
            },
        }

        depth_categories: List[PositionDepthItem] = []
        assigned_player_ids = set()

        for cat_name, cat_spec in categories_def.items():
            cat_players: List[SquadPlayerProfile] = []
            for prof in profiles:
                pos = prof.primary_position or ""
                if any(kw.lower() in pos.lower() for kw in cat_spec["keywords"]):
                    cat_players.append(prof)
                    assigned_player_ids.add(prof.id)

            # Sort players by minutes played descending
            cat_players.sort(key=lambda x: x.total_minutes, reverse=True)
            cnt = len(cat_players)
            tgt = cat_spec["target"]

            if cnt < tgt - 1:
                status = "Critical Void"
            elif cnt < tgt:
                status = "Thin"
            elif cnt > tgt + 2:
                status = "Surplus"
            else:
                status = "Adequate"

            depth_categories.append(
                PositionDepthItem(
                    category=cat_name,
                    target_slots=tgt,
                    current_count=cnt,
                    status=status,
                    players=cat_players,
                )
            )

        # Catch unassigned players and put in Central Defenders or Midfield fallback if needed
        unassigned = [p for p in profiles if p.id not in assigned_player_ids]
        if unassigned:
            depth_categories[1].players.extend(unassigned)
            depth_categories[1].current_count += len(unassigned)

        # Synthesize strengths, vulnerabilities, and recommended recruitment gaps
        strengths = []
        vulnerabilities = []
        recommended_gaps = []

        # Analyze age profile
        if 23.0 <= avg_age <= 26.5:
            strengths.append(f"Optimal squad age profile: {avg_age} years old balances peak athleticism and tactical maturity.")
        elif avg_age > 27.5:
            vulnerabilities.append(f"Aging core (average squad age {avg_age} years). Requires proactive rejuvenation in key running positions.")
        else:
            strengths.append(f"Young, high-ceiling developmental group (average age {avg_age} years).")

        # Analyze positional health
        for item in depth_categories:
            if item.status in ["Critical Void", "Thin"]:
                vulnerabilities.append(
                    f"{item.category}: Currently {item.current_count} options (target: {item.target_slots}). Depth is {item.status.lower()} under fixture congestion."
                )
                recommended_gaps.append({
                    "position": item.category,
                    "urgency": "Immediate" if item.status == "Critical Void" else "High",
                    "reason": f"Only {item.current_count} registered specialists for {item.target_slots} required rotation slots.",
                })
            elif item.status == "Adequate":
                strengths.append(
                    f"{item.category}: Healthy competitive depth with {item.current_count} active players."
                )

        # Check minute concentration (overreliance on top 5 players)
        sorted_by_minutes = sorted(profiles, key=lambda x: x.total_minutes, reverse=True)
        top5_minutes = sum(p.total_minutes for p in sorted_by_minutes[:5])
        all_minutes = sum(p.total_minutes for p in sorted_by_minutes)
        if all_minutes > 0 and (top5_minutes / all_minutes) > 0.45:
            vulnerabilities.append(
                "High minute concentration: Top 5 players carry over 45% of total outfield minutes, creating rotation fatigue risk."
            )

        linked_team = club.linked_team.name if club.linked_team else club.name

        return SquadAssessmentRead(
            club_id=club.id,
            club_name=club.name,
            linked_team_name=linked_team,
            total_squad_size=len(profiles),
            average_age=avg_age,
            depth_categories=depth_categories,
            strengths=strengths,
            vulnerabilities=vulnerabilities,
            recommended_recruitment_gaps=recommended_gaps,
        )
