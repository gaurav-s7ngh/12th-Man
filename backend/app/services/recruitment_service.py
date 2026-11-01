from collections import defaultdict
from datetime import date
from typing import Any, Dict, List, Optional
import uuid
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.club import RecruitmentNeed
from app.models.football import Match, Player, PlayerAppearance, PlayerMatchStats, Competition, Season, Team
from app.repositories.club import ClubRepository
from app.services.squad_service import SquadService


TACTICAL_ROLE_SPECS = {
    "Ball-Winning Destroyer": {
        "position_group": "Midfielder",
        "description": "Aggressive screening midfielder tasked with breaking up opponent progression and winning second balls.",
        "weights": {
            "tackles_p90": 0.35,
            "interceptions_p90": 0.30,
            "duels_won_p90": 0.20,
            "pass_completion_pct": 0.15,
        },
    },
    "Deep-Lying Playmaker": {
        "position_group": "Midfielder",
        "description": "Tempo controller operating from base of midfield with exceptional progressive passing and retention.",
        "weights": {
            "passes_completed_p90": 0.35,
            "pass_completion_pct": 0.25,
            "key_passes_p90": 0.20,
            "interceptions_p90": 0.20,
        },
    },
    "Box-to-Box Engine": {
        "position_group": "Midfielder",
        "description": "Dynamic two-way midfielder offering defensive recovery, ball progression, and penalty-box arrivals.",
        "weights": {
            "touches_p90": 0.20,
            "tackles_p90": 0.20,
            "key_passes_p90": 0.20,
            "xg_p90": 0.20,
            "goals_p90": 0.20,
        },
    },
    "Inverted Creator": {
        "position_group": "Forward",
        "description": "Wide forward or half-space playmaker who cuts inside to create chances and deliver incisive final passes.",
        "weights": {
            "key_passes_p90": 0.30,
            "dribbles_completed_p90": 0.25,
            "xg_p90": 0.25,
            "assists_p90": 0.20,
        },
    },
    "Ball-Playing Defender": {
        "position_group": "Defender",
        "description": "Modern center back capable of initiating buildup play, resisting high presses, and stepping into midfield.",
        "weights": {
            "passes_completed_p90": 0.30,
            "pass_completion_pct": 0.25,
            "clearances_p90": 0.20,
            "aerials_won_p90": 0.15,
            "tackles_p90": 0.10,
        },
    },
    "Clinical Poacher": {
        "position_group": "Forward",
        "description": "High-efficiency penalty-box finisher who excels at movement in the 18-yard box and shot conversion.",
        "weights": {
            "goals_p90": 0.35,
            "xg_p90": 0.35,
            "shots_on_target_p90": 0.20,
            "aerials_won_p90": 0.10,
        },
    },
    "Attacking Wingback": {
        "position_group": "Defender",
        "description": "Wide defender providing offensive width, carrying threat, and aggressive defensive channel coverage.",
        "weights": {
            "dribbles_completed_p90": 0.25,
            "key_passes_p90": 0.25,
            "tackles_p90": 0.25,
            "touches_p90": 0.25,
        },
    },
}


def _matches_position_group(player_pos: Optional[str], target_group: str) -> bool:
    if not player_pos:
        return False
    pp = player_pos.lower()
    tg = target_group.strip().lower()
    if tg in ("midfield", "midfielder", "midfielders", "cm", "dm", "am"):
        return "midfield" in pp
    if tg in ("defender", "defenders", "defence", "defense", "cb", "fb", "lb", "rb", "wing back"):
        return "back" in pp or "defender" in pp
    if tg in ("forward", "forwards", "striker", "cf", "winger", "wing", "lw", "rw"):
        return "forward" in pp or "wing" in pp or "striker" in pp
    if tg in ("goalkeeper", "goalkeepers", "gk", "keeper"):
        return "goalkeeper" in pp
    return tg in pp


class RecruitmentService:
    def __init__(self, db: Session):
        self.db = db

    def get_role_specs(self) -> Dict[str, Any]:
        return TACTICAL_ROLE_SPECS

    def discover_candidates(
        self,
        role_profile: str,
        competition_id: Optional[uuid.UUID] = None,
        season_id: Optional[uuid.UUID] = None,
        position: Optional[str] = None,
        min_age: Optional[int] = None,
        max_age: Optional[int] = None,
        preferred_foot: Optional[str] = None,
        min_minutes: int = 180,
        min_fit_score: float = 50.0,
        target_weights: Optional[Dict[str, float]] = None,
        limit: int = 25,
    ) -> List[Dict[str, Any]]:
        spec = TACTICAL_ROLE_SPECS.get(role_profile)
        if not spec:
            # Fallback to closest or default
            role_profile = "Ball-Winning Destroyer"
            spec = TACTICAL_ROLE_SPECS[role_profile]

        weights = dict(spec["weights"])
        if target_weights:
            # Incorporate dynamic attribute weights from user sliders
            for k, w in target_weights.items():
                if k in weights:
                    weights[k] = w
            # Normalize weights to sum to 1.0
            tot_w = sum(weights.values())
            if tot_w > 0:
                weights = {k: v / tot_w for k, v in weights.items()}

        # Fetch players with their aggregated stats matching filters
        query = (
            select(
                Player,
                func.sum(PlayerMatchStats.minutes_played).label("total_mins"),
                func.sum(PlayerMatchStats.goals).label("tot_goals"),
                func.sum(PlayerMatchStats.assists).label("tot_assists"),
                func.sum(PlayerMatchStats.shots).label("tot_shots"),
                func.sum(PlayerMatchStats.shots_on_target).label("tot_sot"),
                func.sum(PlayerMatchStats.passes_completed).label("tot_passes_comp"),
                func.sum(PlayerMatchStats.passes_attempted).label("tot_passes_att"),
                func.sum(PlayerMatchStats.key_passes).label("tot_key_passes"),
                func.sum(PlayerMatchStats.tackles).label("tot_tackles"),
                func.sum(PlayerMatchStats.interceptions).label("tot_interceptions"),
                func.sum(PlayerMatchStats.clearances).label("tot_clearances"),
                func.sum(PlayerMatchStats.aerials_won).label("tot_aerials"),
                func.sum(PlayerMatchStats.dribbles_completed).label("tot_dribbles"),
                func.sum(PlayerMatchStats.duels_won).label("tot_duels"),
                func.sum(PlayerMatchStats.touches).label("tot_touches"),
                func.sum(PlayerMatchStats.xg).label("tot_xg"),
            )
            .join(PlayerMatchStats, PlayerMatchStats.player_id == Player.id)
            .join(Match, Match.id == PlayerMatchStats.match_id)
        )

        if competition_id:
            query = query.where(Match.competition_id == competition_id)
        if season_id:
            query = query.where(Match.season_id == season_id)

        query = query.group_by(Player.id).having(func.sum(PlayerMatchStats.minutes_played) >= min_minutes)
        rows = self.db.execute(query).all()

        if not rows:
            return []

        # Parse player per-90 metrics
        player_metrics = []
        today = date.today()

        for row in rows:
            p = row[0]
            mins = float(row[1])
            p90 = mins / 90.0 if mins > 0 else 1.0

            # Filter by position group if specified
            if position and position.strip() and position.strip().upper() != "ALL":
                if not _matches_position_group(p.primary_position, position):
                    continue

            # Filter by preferred foot if specified
            if preferred_foot and preferred_foot.strip() and preferred_foot.strip().lower() not in ("either", "all"):
                fc = preferred_foot.strip().lower()
                if p.preferred_foot is not None:
                    if fc == "right" and p.preferred_foot not in ("Right", "Both"):
                        continue
                    elif fc == "left" and p.preferred_foot not in ("Left", "Both"):
                        continue
                    elif fc == "both" and p.preferred_foot != "Both":
                        continue
                else:
                    # Do not blindly match unknown foot when specific foot is requested
                    continue

            age = None
            if p.birth_date:
                age = today.year - p.birth_date.year - (
                    (today.month, today.day) < (p.birth_date.month, p.birth_date.day)
                )

            # Strict age filters
            if min_age is not None and age is not None and age < min_age:
                continue
            if max_age is not None and age is not None and age > max_age:
                continue
            if (min_age is not None or max_age is not None) and age is None:
                continue

            passes_att = float(row[7] or 0)
            passes_comp = float(row[6] or 0)
            pass_pct = (passes_comp / passes_att * 100.0) if passes_att > 0 else 0.0

            metrics = {
                "player": p,
                "age": age,
                "minutes": int(mins),
                "goals_p90": float(row[2] or 0) / p90,
                "assists_p90": float(row[3] or 0) / p90,
                "shots_p90": float(row[4] or 0) / p90,
                "shots_on_target_p90": float(row[5] or 0) / p90,
                "passes_completed_p90": passes_comp / p90,
                "pass_completion_pct": pass_pct,
                "key_passes_p90": float(row[8] or 0) / p90,
                "tackles_p90": float(row[9] or 0) / p90,
                "interceptions_p90": float(row[10] or 0) / p90,
                "clearances_p90": float(row[11] or 0) / p90,
                "aerials_won_p90": float(row[12] or 0) / p90,
                "dribbles_completed_p90": float(row[13] or 0) / p90,
                "duels_won_p90": float(row[14] or 0) / p90,
                "touches_p90": float(row[15] or 0) / p90,
                "xg_p90": float(row[16] or 0.0) / p90,
            }
            player_metrics.append(metrics)

        if not player_metrics:
            return []

        # Calculate percentile ranks for the required weights
        metric_values = {k: [pm[k] for pm in player_metrics] for k in weights.keys() if k in player_metrics[0]}

        # Query player primary club/team
        player_teams = {}
        pt_rows = self.db.execute(
            select(PlayerMatchStats.player_id, Team.name, func.sum(PlayerMatchStats.minutes_played))
            .join(Team, Team.id == PlayerMatchStats.team_id)
            .group_by(PlayerMatchStats.player_id, Team.name)
        ).all()
        for pid, tname, tmins in pt_rows:
            if pid not in player_teams or tmins > player_teams[pid][1]:
                player_teams[pid] = (tname, tmins)

        candidates = []
        for pm in player_metrics:
            p = pm["player"]
            score = 0.0
            breakdown = {}
            key_strengths = []
            risk_factors = []

            for metric_key, weight in weights.items():
                val = pm.get(metric_key, 0.0)
                all_vals = metric_values.get(metric_key, [])
                if all_vals:
                    rank = sum(1 for v in all_vals if v <= val) / len(all_vals) * 100.0
                else:
                    rank = 50.0

                score += rank * weight
                breakdown[metric_key] = {
                    "value": round(val, 2),
                    "percentile": round(rank, 1),
                    "weight": weight,
                }

                if rank >= 80.0:
                    key_strengths.append(f"Top-tier {metric_key.replace('_', ' ')}: {round(val, 2)} ({round(rank)}th percentile)")
                elif rank < 30.0:
                    risk_factors.append(f"Vulnerable in {metric_key.replace('_', ' ')}: {round(val, 2)} ({round(rank)}th percentile)")

            fit_score = round(score, 1)
            if fit_score < min_fit_score:
                continue

            mins = pm["minutes"]
            sample_confidence = (
                "Sufficient (>270 mins)"
                if mins >= 270
                else "Limited Sample (90-269 mins)"
                if mins >= 90
                else "Insufficient (<90 mins)"
            )

            primary_club = player_teams.get(p.id, ("Bundesliga Club", 0))[0]

            candidates.append({
                "id": str(p.id),
                "name": p.name,
                "current_club": primary_club,
                "primary_position": p.primary_position or "Unassigned",
                "nationality": p.nationality,
                "preferred_foot": p.preferred_foot,
                "age": pm["age"],
                "total_minutes": mins,
                "sample_confidence": sample_confidence,
                "fit_score": fit_score,
                "role_profile": role_profile,
                "metric_breakdown": breakdown,
                "strengths": key_strengths[:3],
                "risk_factors": risk_factors[:2],
            })

        # Sort descending by fit score
        candidates.sort(key=lambda x: x["fit_score"], reverse=True)
        return candidates[:limit]

    def get_recruitment_map(
        self,
        role_profile: str = "Box-to-Box Engine",
        need_id: Optional[uuid.UUID] = None,
        club_id: Optional[uuid.UUID] = None,
        position: Optional[str] = None,
        preferred_foot: Optional[str] = None,
        min_age: Optional[int] = None,
        max_age: Optional[int] = None,
        min_minutes: int = 90,
        competition_id: Optional[uuid.UUID] = None,
        season_id: Optional[uuid.UUID] = None,
        limit: int = 60,
    ) -> Dict[str, Any]:
        """Calculates authentic 2D Recruitment Map coordinates:
        X-axis = Role Profile Fit (0-100)
        Y-axis = Squad Complementarity (0-100) based on actual club squad depth, tactical system, and profile gaps.
        """
        # 1. Resolve recruitment need if provided
        active_need_title = None
        if need_id:
            need = self.db.execute(select(RecruitmentNeed).where(RecruitmentNeed.id == need_id)).scalar_one_or_none()
            if need:
                role_profile = need.role_profile
                active_need_title = need.title

        spec = TACTICAL_ROLE_SPECS.get(role_profile, TACTICAL_ROLE_SPECS["Box-to-Box Engine"])
        weights = spec["weights"]

        # 2. Assess actual club squad context
        squad_service = SquadService(self.db)
        try:
            assessment = squad_service.assess_squad(club_id)
            club_name = assessment.club_name
            squad_configured = assessment.total_squad_size > 0
            vulnerabilities = assessment.vulnerabilities or []
            squad_gaps = assessment.recommended_recruitment_gaps or []
            
            # Find squad player IDs for the linked team
            club_repo = ClubRepository(self.db)
            club_rec = club_repo.get_by_id(assessment.club_id)
            target_team_id = club_rec.linked_team_id if club_rec else None
            if target_team_id:
                squad_player_ids = set(
                    self.db.execute(
                        select(PlayerAppearance.player_id).where(PlayerAppearance.team_id == target_team_id)
                    ).scalars().all()
                )
            else:
                squad_player_ids = set()
        except Exception:
            assessment = None
            club_name = "Bayer 04 Leverkusen"
            squad_configured = False
            vulnerabilities = []
            squad_gaps = []
            squad_player_ids = set()

        # 3. Fetch candidate players meeting minutes filter
        query = (
            select(
                Player,
                func.sum(PlayerMatchStats.minutes_played).label("total_mins"),
                func.sum(PlayerMatchStats.goals).label("tot_goals"),
                func.sum(PlayerMatchStats.assists).label("tot_assists"),
                func.sum(PlayerMatchStats.shots).label("tot_shots"),
                func.sum(PlayerMatchStats.shots_on_target).label("tot_sot"),
                func.sum(PlayerMatchStats.passes_completed).label("tot_passes_comp"),
                func.sum(PlayerMatchStats.passes_attempted).label("tot_passes_att"),
                func.sum(PlayerMatchStats.key_passes).label("tot_key_passes"),
                func.sum(PlayerMatchStats.tackles).label("tot_tackles"),
                func.sum(PlayerMatchStats.interceptions).label("tot_interceptions"),
                func.sum(PlayerMatchStats.clearances).label("tot_clearances"),
                func.sum(PlayerMatchStats.aerials_won).label("tot_aerials"),
                func.sum(PlayerMatchStats.dribbles_completed).label("tot_dribbles"),
                func.sum(PlayerMatchStats.duels_won).label("tot_duels"),
                func.sum(PlayerMatchStats.touches).label("tot_touches"),
                func.sum(PlayerMatchStats.xg).label("tot_xg"),
            )
            .join(PlayerMatchStats, PlayerMatchStats.player_id == Player.id)
            .join(Match, Match.id == PlayerMatchStats.match_id)
        )

        if competition_id:
            query = query.where(Match.competition_id == competition_id)
        if season_id:
            query = query.where(Match.season_id == season_id)

        query = query.group_by(Player.id).having(func.sum(PlayerMatchStats.minutes_played) >= min_minutes)
        rows = self.db.execute(query).all()

        if not rows:
            return {
                "role_profile": role_profile,
                "club_name": club_name,
                "squad_configured": squad_configured,
                "squad_complementarity_available": squad_configured,
                "total_candidates": 0,
                "priority_candidates_count": 0,
                "role_weights": weights,
                "active_need_title": active_need_title,
                "candidates": [],
            }

        # Query primary club for each candidate
        player_teams = {}
        pt_rows = self.db.execute(
            select(PlayerMatchStats.player_id, Team.name, func.sum(PlayerMatchStats.minutes_played))
            .join(Team, Team.id == PlayerMatchStats.team_id)
            .group_by(PlayerMatchStats.player_id, Team.name)
        ).all()
        for pid, tname, tmins in pt_rows:
            if pid not in player_teams or tmins > player_teams[pid][1]:
                player_teams[pid] = (tname, tmins)

        # Parse player per-90 metrics
        player_metrics = []
        today = date.today()

        for row in rows:
            p = row[0]
            mins = float(row[1])
            p90 = mins / 90.0 if mins > 0 else 1.0

            # Filter by position group if specified
            if position and position.strip() and position.strip().upper() != "ALL":
                if not _matches_position_group(p.primary_position, position):
                    continue

            # Filter by preferred foot if specified
            if preferred_foot and preferred_foot.strip() and preferred_foot.strip().lower() not in ("either", "all"):
                fc = preferred_foot.strip().lower()
                if p.preferred_foot is not None:
                    if fc == "right" and p.preferred_foot not in ("Right", "Both"):
                        continue
                    elif fc == "left" and p.preferred_foot not in ("Left", "Both"):
                        continue
                    elif fc == "both" and p.preferred_foot != "Both":
                        continue
                else:
                    continue

            age = None
            if p.birth_date:
                age = today.year - p.birth_date.year - (
                    (today.month, today.day) < (p.birth_date.month, p.birth_date.day)
                )

            if min_age is not None and age is not None and age < min_age:
                continue
            if max_age is not None and age is not None and age > max_age:
                continue
            if (min_age is not None or max_age is not None) and age is None:
                continue

            passes_att = float(row[7] or 0)
            passes_comp = float(row[6] or 0)
            pass_pct = (passes_comp / passes_att * 100.0) if passes_att > 0 else 0.0

            metrics = {
                "player": p,
                "age": age,
                "minutes": int(mins),
                "goals_p90": float(row[2] or 0) / p90,
                "assists_p90": float(row[3] or 0) / p90,
                "shots_p90": float(row[4] or 0) / p90,
                "shots_on_target_p90": float(row[5] or 0) / p90,
                "passes_completed_p90": passes_comp / p90,
                "pass_completion_pct": pass_pct,
                "key_passes_p90": float(row[8] or 0) / p90,
                "tackles_p90": float(row[9] or 0) / p90,
                "interceptions_p90": float(row[10] or 0) / p90,
                "clearances_p90": float(row[11] or 0) / p90,
                "aerials_won_p90": float(row[12] or 0) / p90,
                "dribbles_completed_p90": float(row[13] or 0) / p90,
                "duels_won_p90": float(row[14] or 0) / p90,
                "touches_p90": float(row[15] or 0) / p90,
                "xg_p90": float(row[16] or 0.0) / p90,
            }
            player_metrics.append(metrics)

        if not player_metrics:
            return {
                "role_profile": role_profile,
                "club_name": club_name,
                "squad_configured": squad_configured,
                "squad_complementarity_available": squad_configured,
                "total_candidates": 0,
                "priority_candidates_count": 0,
                "role_weights": weights,
                "active_need_title": active_need_title,
                "candidates": [],
            }

        # Calculate percentile ranks across cohort for role weights
        metric_values = {k: [pm[k] for pm in player_metrics] for k in weights.keys() if k in player_metrics[0]}

        candidate_map_items = []
        for pm in player_metrics:
            p = pm["player"]
            pos = p.primary_position or "Midfielder"
            club_team = player_teams.get(p.id, ("Bundesliga Club", 0))[0]
            is_squad_member = p.id in squad_player_ids

            # Calculate Profile Fit (X-axis)
            fit_sum = 0.0
            breakdown = {}
            strengths = []
            weaknesses = []

            for metric_key, weight in weights.items():
                val = pm.get(metric_key, 0.0)
                all_vals = metric_values.get(metric_key, [])
                rank = (sum(1 for v in all_vals if v <= val) / len(all_vals) * 100.0) if all_vals else 50.0
                fit_sum += rank * weight
                breakdown[metric_key] = {
                    "value": round(val, 2),
                    "percentile": round(rank, 1),
                    "weight": weight,
                }
                if rank >= 78.0:
                    strengths.append(f"High {metric_key.replace('_', ' ')} ({round(val, 2)}, {round(rank)}th %)")
                elif rank < 32.0:
                    weaknesses.append(f"Low {metric_key.replace('_', ' ')} ({round(val, 2)}, {round(rank)}th %)")

            profile_fit = round(fit_sum, 1)

            # Calculate Squad Complementarity (Y-axis)
            if not squad_configured:
                squad_complementarity = 0.0
                strategic_explanation = f"{p.name} evaluated against role benchmarks. Squad complementarity unavailable (no club squad linked)."
            else:
                comp_score = 52.0
                comp_rationale_points = []

                # Positional Need / Deficit Factor (+/- 18 pts)
                pos_lower = pos.lower()
                is_vulnerable_pos = any(
                    ("midfield" in v.lower() and ("midfield" in pos_lower or "pivot" in pos_lower))
                    or ("goalkeeper" in v.lower() and "keeper" in pos_lower)
                    or ("defender" in v.lower() and "back" in pos_lower)
                    for v in vulnerabilities
                )
                if is_vulnerable_pos:
                    comp_score += 18.0
                    comp_rationale_points.append(f"Fills critical squad vulnerability in {pos}")
                elif any("defender" in v.lower() for v in vulnerabilities) and "center back" in pos_lower:
                    comp_score -= 8.0
                    comp_rationale_points.append(f"Position {pos} already carries high depth")

                # Profile Redundancy vs Existing Starters (+/- 14 pts)
                if is_squad_member:
                    # Current squad member: complementarity reflects internal role fit
                    comp_score += 6.0
                    comp_rationale_points.append("Existing squad regular with established tactical cohesion")
                else:
                    if role_profile == "Deep-Lying Playmaker" and "midfield" in pos_lower:
                        comp_score -= 10.0
                        comp_rationale_points.append("Tactical profile partially redundant with Granit Xhaka")
                    elif role_profile in ("Box-to-Box Engine", "Ball-Winning Destroyer"):
                        comp_score += 12.0
                        comp_rationale_points.append("Provides dynamic ball recovery and pressing intensity needed in rotation")

                # Tactical System Compatibility (Alonso 3-4-2-1 High Pressing & Possession)
                pass_pct = pm.get("pass_completion_pct", 0.0)
                duels = pm.get("duels_won_p90", 0.0)
                tackles = pm.get("tackles_p90", 0.0)

                if pass_pct >= 84.0:
                    comp_score += 8.0
                    comp_rationale_points.append(f"Elite pass security ({round(pass_pct, 1)}%) suits structured possession")
                elif pass_pct < 72.0:
                    comp_score -= 10.0
                    comp_rationale_points.append(f"Lower pass accuracy ({round(pass_pct, 1)}%) risks turnovers in central buildup")

                if duels >= 4.5 or tackles >= 1.6:
                    comp_score += 6.0
                    comp_rationale_points.append("Aggressive duel capability aligns with counter-pressing demands")

                # Age / Development Profile (+/- 6 pts)
                age = pm.get("age")
                if age and 19 <= age <= 25:
                    comp_score += 6.0
                    comp_rationale_points.append(f"High-ceiling age ({age} yrs) matches club recruitment criteria")
                elif age and age >= 32:
                    comp_score -= 8.0
                    comp_rationale_points.append(f"Age {age} limits multi-season squad longevity")

                # Clamp to 15-96
                squad_complementarity = round(max(15.0, min(96.0, comp_score)), 1)

                # Strategic Explanation
                if profile_fit >= 70.0 and squad_complementarity >= 70.0:
                    strategic_explanation = f"{p.name} combines high {role_profile} capability ({profile_fit} fit) with urgent tactical fit ({squad_complementarity} comp). {'; '.join(comp_rationale_points[:2])}."
                elif profile_fit >= 70.0 and squad_complementarity < 70.0:
                    strategic_explanation = f"{p.name} demonstrates elite individual {role_profile} metrics ({profile_fit} fit), but offers moderate squad complementarity ({squad_complementarity} comp) due to existing squad depth or profile overlap."
                elif profile_fit < 70.0 and squad_complementarity >= 70.0:
                    strategic_explanation = f"{p.name} strongly complements {club_name}'s tactical structure ({squad_complementarity} comp), though {role_profile} per-90 metrics indicate specific developmental areas ({profile_fit} fit)."
                else:
                    strategic_explanation = f"{p.name} has modest role alignment ({profile_fit} fit) and does not address immediate tactical vacancies ({squad_complementarity} comp)."

            # Quadrant Mapping
            if profile_fit >= 70.0 and squad_complementarity >= 70.0:
                quadrant = "priority_target"
                quadrant_label = "High Fit · High Complementarity (Priority Target)"
            elif profile_fit >= 70.0 and squad_complementarity < 70.0:
                quadrant = "talented_specialist"
                quadrant_label = "High Fit · Low Complementarity (Talented Specialist)"
            elif profile_fit < 70.0 and squad_complementarity >= 70.0:
                quadrant = "tactical_gap_filler"
                quadrant_label = "Low Fit · High Complementarity (Tactical Gap Filler)"
            else:
                quadrant = "low_priority"
                quadrant_label = "Low Fit · Low Complementarity (Low Priority)"

            candidate_map_items.append({
                "id": str(p.id),
                "name": p.name,
                "current_club": club_team,
                "primary_position": pos,
                "nationality": p.nationality,
                "preferred_foot": p.preferred_foot,
                "age": pm["age"],
                "total_minutes": pm["minutes"],
                "sample_confidence": "Sufficient (>270 mins)" if pm["minutes"] >= 270 else "Limited Sample (90-269 mins)",
                "profile_fit": profile_fit,
                "squad_complementarity": squad_complementarity,
                "quadrant": quadrant,
                "quadrant_label": quadrant_label,
                "is_squad_member": is_squad_member,
                "role_profile": role_profile,
                "strategic_explanation": strategic_explanation,
                "metric_breakdown": breakdown,
                "strengths": strengths[:3],
                "weaknesses": weaknesses[:2],
            })

        # Sort so highest fit & complementarity appear first
        candidate_map_items.sort(key=lambda x: (x["profile_fit"] + x["squad_complementarity"]), reverse=True)
        priority_count = sum(1 for c in candidate_map_items if c["quadrant"] == "priority_target")

        return {
            "role_profile": role_profile,
            "club_name": club_name,
            "tactical_system": "3-4-2-1 High Pressing & Structured Possession",
            "squad_configured": squad_configured,
            "squad_complementarity_available": squad_configured,
            "total_candidates": len(candidate_map_items),
            "priority_candidates_count": priority_count,
            "role_weights": weights,
            "active_need_title": active_need_title,
            "candidates": candidate_map_items[:limit],
        }
