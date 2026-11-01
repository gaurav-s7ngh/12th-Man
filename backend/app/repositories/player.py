from datetime import date
from typing import Any, Dict, List, Optional, Tuple
import uuid
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.football import Match, Player, PlayerAppearance, PlayerMatchStats, Team


def _build_position_clause(position: str):
    pos_clean = position.strip().lower()
    if pos_clean in ("midfield", "midfielder", "midfielders", "cm", "dm", "am"):
        return Player.primary_position.ilike("%Midfield%")
    elif pos_clean in ("defender", "defenders", "defence", "defense", "cb", "fb", "lb", "rb", "wing back"):
        return or_(
            Player.primary_position.ilike("%Back%"),
            Player.primary_position.ilike("%Defender%"),
        )
    elif pos_clean in ("forward", "forwards", "striker", "cf", "winger", "wing", "lw", "rw"):
        return or_(
            Player.primary_position.ilike("%Forward%"),
            Player.primary_position.ilike("%Wing%"),
            Player.primary_position.ilike("%Striker%"),
        )
    elif pos_clean in ("goalkeeper", "goalkeepers", "gk", "keeper"):
        return Player.primary_position.ilike("%Goalkeeper%")
    else:
        return Player.primary_position.ilike(f"%{position.strip()}%")


def _build_role_clause(role: str):
    role_clean = role.strip().lower()
    if "box-to-box" in role_clean:
        return Player.primary_position.ilike("%Midfield%")
    elif "deep-lying playmaker" in role_clean:
        return or_(
            Player.primary_position.ilike("%Defensive Midfield%"),
            Player.primary_position.ilike("%Center Midfield%"),
        )
    elif "ball-winning" in role_clean or "destroyer" in role_clean:
        return Player.primary_position.ilike("%Defensive Midfield%")
    elif "inverted creator" in role_clean or "playmaker" in role_clean:
        return or_(
            Player.primary_position.ilike("%Attacking Midfield%"),
            Player.primary_position.ilike("%Wing%"),
        )
    elif "ball-playing defender" in role_clean:
        return or_(
            Player.primary_position.ilike("%Center Back%"),
            Player.primary_position.ilike("%Back%"),
        )
    elif "poacher" in role_clean or "striker" in role_clean:
        return or_(
            Player.primary_position.ilike("%Forward%"),
            Player.primary_position.ilike("%Striker%"),
        )
    elif "wingback" in role_clean:
        return or_(
            Player.primary_position.ilike("%Wing Back%"),
            Player.primary_position.ilike("%Back%"),
        )
    return None


class PlayerRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_players(
        self,
        skip: int = 0,
        limit: int = 50,
        search: Optional[str] = None,
        position: Optional[str] = None,
        role: Optional[str] = None,
        nationality: Optional[str] = None,
        preferred_foot: Optional[str] = None,
        team_id: Optional[uuid.UUID] = None,
        competition_id: Optional[uuid.UUID] = None,
        season_id: Optional[uuid.UUID] = None,
        min_minutes: Optional[int] = None,
        max_minutes: Optional[int] = None,
        min_age: Optional[int] = None,
        max_age: Optional[int] = None,
        sort_by: Optional[str] = "name",
        sort_order: Optional[str] = "asc",
    ) -> Tuple[List[Player], int]:
        # Base query grouping by Player.id with sum of minutes, goals, assists
        tot_mins_col = func.coalesce(func.sum(PlayerMatchStats.minutes_played), 0).label("tot_mins")
        tot_goals_col = func.coalesce(func.sum(PlayerMatchStats.goals), 0).label("tot_goals")
        tot_assists_col = func.coalesce(func.sum(PlayerMatchStats.assists), 0).label("tot_assists")

        query = (
            select(Player, tot_mins_col, tot_goals_col, tot_assists_col)
            .outerjoin(PlayerMatchStats, PlayerMatchStats.player_id == Player.id)
            .group_by(Player.id)
        )

        # Filters on Player table
        if search and search.strip():
            query = query.where(Player.name.ilike(f"%{search.strip()}%"))

        if position and position.strip() and position.strip().lower() != "all positions":
            query = query.where(_build_position_clause(position))

        if role and role.strip() and role.strip().lower() not in ("all roles", "all"):
            role_clause = _build_role_clause(role)
            if role_clause is not None:
                query = query.where(role_clause)

        if nationality and nationality.strip():
            query = query.where(Player.nationality.ilike(f"%{nationality.strip()}%"))

        if preferred_foot and preferred_foot.strip() and preferred_foot.strip().lower() not in ("either", "all"):
            foot_clean = preferred_foot.strip().lower()
            if foot_clean == "right":
                query = query.where(Player.preferred_foot.in_(["Right", "Both"]))
            elif foot_clean == "left":
                query = query.where(Player.preferred_foot.in_(["Left", "Both"]))
            elif foot_clean == "both":
                query = query.where(Player.preferred_foot == "Both")

        # Age filters
        if min_age is not None or max_age is not None:
            today = date.today()
            if max_age is not None:
                min_birth_year = today.year - max_age - 1
                query = query.where(Player.birth_date.isnot(None), Player.birth_date >= date(min_birth_year, 1, 1))
            if min_age is not None:
                max_birth_year = today.year - min_age
                query = query.where(Player.birth_date.isnot(None), Player.birth_date <= date(max_birth_year, 12, 31))

        # Appearance / Match-level filters
        if team_id or competition_id or season_id:
            query = query.join(PlayerAppearance, PlayerAppearance.player_id == Player.id)
            if competition_id or season_id:
                query = query.join(Match, Match.id == PlayerAppearance.match_id)
            if team_id:
                query = query.where(PlayerAppearance.team_id == team_id)
            if competition_id:
                query = query.where(Match.competition_id == competition_id)
            if season_id:
                query = query.where(Match.season_id == season_id)

        # Minutes filters in HAVING clause
        if min_minutes is not None and min_minutes > 0:
            query = query.having(tot_mins_col >= min_minutes)
        if max_minutes is not None and max_minutes > 0:
            query = query.having(tot_mins_col <= max_minutes)

        # Calculate exact total count matching all active filters
        subq = query.subquery()
        total = self.db.execute(select(func.count()).select_from(subq)).scalar_one()

        # Sorting
        is_desc = (sort_order or "asc").lower() == "desc"
        sort_field = (sort_by or "name").lower()

        if sort_field == "minutes":
            order_expr = tot_mins_col.desc() if is_desc else tot_mins_col.asc()
        elif sort_field == "goals":
            order_expr = tot_goals_col.desc() if is_desc else tot_goals_col.asc()
        elif sort_field == "assists":
            order_expr = tot_assists_col.desc() if is_desc else tot_assists_col.asc()
        elif sort_field == "position":
            order_expr = Player.primary_position.desc() if is_desc else Player.primary_position.asc()
        elif sort_field == "nationality":
            order_expr = Player.nationality.desc() if is_desc else Player.nationality.asc()
        else:
            order_expr = Player.name.desc() if is_desc else Player.name.asc()

        query = query.order_by(order_expr).offset(skip).limit(limit)
        rows = self.db.execute(query).all()

        if not rows:
            return [], total

        # Query primary club for each returned player
        pids = [row[0].id for row in rows]
        team_rows = self.db.execute(
            select(PlayerMatchStats.player_id, Team.name, func.sum(PlayerMatchStats.minutes_played))
            .join(Team, Team.id == PlayerMatchStats.team_id)
            .where(PlayerMatchStats.player_id.in_(pids))
            .group_by(PlayerMatchStats.player_id, Team.name)
        ).all()
        teams_by_pid: Dict[uuid.UUID, str] = {}
        for pid, tname, _ in sorted(team_rows, key=lambda x: x[2] or 0):
            teams_by_pid[pid] = tname

        players: List[Player] = []
        for row in rows:
            p: Player = row[0]
            tot_mins = int(row[1] or 0)
            p.total_minutes = tot_mins
            p.current_team = teams_by_pid.get(p.id, "Bundesliga Club")
            players.append(p)

        return players, total

    def get_by_id(self, player_id: uuid.UUID) -> Optional[Player]:
        return self.db.execute(
            select(Player).where(Player.id == player_id)
        ).scalar_one_or_none()

    def get_appearances(
        self,
        player_id: uuid.UUID,
        competition_id: Optional[uuid.UUID] = None,
        season_id: Optional[uuid.UUID] = None,
    ) -> List[PlayerAppearance]:
        query = (
            select(PlayerAppearance)
            .options(
                joinedload(PlayerAppearance.match).joinedload(Match.home_team),
                joinedload(PlayerAppearance.match).joinedload(Match.away_team),
                joinedload(PlayerAppearance.match).joinedload(Match.competition),
                joinedload(PlayerAppearance.match).joinedload(Match.season),
            )
            .where(PlayerAppearance.player_id == player_id)
        )
        if competition_id or season_id:
            query = query.join(Match, Match.id == PlayerAppearance.match_id)
            if competition_id:
                query = query.where(Match.competition_id == competition_id)
            if season_id:
                query = query.where(Match.season_id == season_id)

        return list(self.db.execute(
            query.order_by(PlayerAppearance.created_at.desc())
        ).scalars().all())

    def get_match_stats(
        self,
        player_id: uuid.UUID,
        competition_id: Optional[uuid.UUID] = None,
        season_id: Optional[uuid.UUID] = None,
    ) -> List[PlayerMatchStats]:
        query = (
            select(PlayerMatchStats)
            .options(
                joinedload(PlayerMatchStats.match).joinedload(Match.home_team),
                joinedload(PlayerMatchStats.match).joinedload(Match.away_team),
                joinedload(PlayerMatchStats.match).joinedload(Match.competition),
                joinedload(PlayerMatchStats.match).joinedload(Match.season),
            )
            .where(PlayerMatchStats.player_id == player_id)
        )
        if competition_id or season_id:
            query = query.join(Match, Match.id == PlayerMatchStats.match_id)
            if competition_id:
                query = query.where(Match.competition_id == competition_id)
            if season_id:
                query = query.where(Match.season_id == season_id)

        return list(self.db.execute(query).scalars().all())

    def get_aggregated_stats(
        self,
        player_id: uuid.UUID,
        competition_id: Optional[uuid.UUID] = None,
        season_id: Optional[uuid.UUID] = None,
    ) -> Optional[Dict[str, Any]]:
        stats_list = self.get_match_stats(player_id, competition_id=competition_id, season_id=season_id)
        if not stats_list:
            return None

        apps = self.get_appearances(player_id, competition_id=competition_id, season_id=season_id)
        starts = sum(1 for a in apps if a.is_starter)
        subs = sum(1 for a in apps if a.is_substitute)

        total_mins = sum(s.minutes_played for s in stats_list)
        goals = sum(s.goals for s in stats_list)
        assists = sum(s.assists for s in stats_list)
        shots = sum(s.shots for s in stats_list)
        shots_on_target = sum(s.shots_on_target for s in stats_list)
        passes_att = sum(s.passes_attempted for s in stats_list)
        passes_comp = sum(s.passes_completed for s in stats_list)
        pass_pct = round((passes_comp / passes_att * 100), 1) if passes_att > 0 else 0.0
        key_passes = sum(s.key_passes for s in stats_list)
        tackles = sum(s.tackles for s in stats_list)
        interceptions = sum(s.interceptions for s in stats_list)
        clearances = sum(s.clearances for s in stats_list)
        aerials_won = sum(s.aerials_won for s in stats_list)
        dribbles = sum(s.dribbles_completed for s in stats_list)
        duels_won = sum(s.duels_won for s in stats_list)
        touches = sum(s.touches for s in stats_list)
        total_xg = round(sum(s.xg or 0.0 for s in stats_list), 2)
        total_xa = round(sum(s.xa or 0.0 for s in stats_list), 2)

        # per 90 metrics
        p90_factor = (total_mins / 90.0) if total_mins > 0 else 0.0

        def per_90(val: float) -> float:
            return round(val / p90_factor, 2) if p90_factor > 0 else 0.0

        return {
            "matches_played": len(apps),
            "starts": starts,
            "sub_appearances": subs,
            "total_minutes": total_mins,
            "goals": goals,
            "assists": assists,
            "shots": shots,
            "shots_on_target": shots_on_target,
            "passes_attempted": passes_att,
            "passes_completed": passes_comp,
            "pass_completion_pct": pass_pct,
            "key_passes": key_passes,
            "tackles": tackles,
            "interceptions": interceptions,
            "clearances": clearances,
            "aerials_won": aerials_won,
            "dribbles_completed": dribbles,
            "duels_won": duels_won,
            "touches": touches,
            "total_xg": total_xg,
            "total_xa": total_xa,
            "xg_per_90": per_90(total_xg),
            "xa_per_90": per_90(total_xa),
            "goals_per_90": per_90(goals),
            "assists_per_90": per_90(assists),
            "key_passes_per_90": per_90(key_passes),
            "tackles_per_90": per_90(tackles),
            "interceptions_per_90": per_90(interceptions),
        }
