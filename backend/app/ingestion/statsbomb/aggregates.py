from collections import defaultdict
from typing import Any, Dict, List, Optional
import uuid


def compute_player_match_stats(
    player_id: uuid.UUID,
    match_id: uuid.UUID,
    team_id: uuid.UUID,
    appearance_minutes: int,
    events: List[Dict[str, Any]],
    shot_xg_by_id: Optional[Dict[str, float]] = None,
) -> Dict[str, Any]:
    """
    Aggregates match events for a single player in a match.
    All statistics are strictly derived from actual StatsBomb event data.
    """
    if shot_xg_by_id is None:
        shot_xg_by_id = {}

    goals = 0
    assists = 0
    shots = 0
    shots_on_target = 0
    passes_attempted = 0
    passes_completed = 0
    key_passes = 0
    tackles = 0
    interceptions = 0
    clearances = 0
    fouls_committed = 0
    fouls_won = 0
    yellow_cards = 0
    red_cards = 0
    aerials_won = 0
    dribbles_completed = 0
    duels_won = 0
    touches = 0
    total_xg = 0.0
    total_xa = 0.0

    pressures = 0
    carries = 0
    crosses = 0

    on_target_outcomes = {"Goal", "Saved", "Saved to Post", "Saved Off Target"}

    for ev in events:
        etype = ev.get("type", {}).get("name")
        period = ev.get("period", 1)
        # We process match periods 1-4 (normal + extra time), ignore penalty shootouts (period 5) for base stats
        if period > 4:
            continue

        touches += 1

        if etype == "Shot":
            shot = ev.get("shot", {})
            shots += 1
            xg = shot.get("statsbomb_xg", 0.0) or 0.0
            total_xg += xg
            outcome = shot.get("outcome", {}).get("name", "")
            if outcome == "Goal":
                goals += 1
            if outcome in on_target_outcomes:
                shots_on_target += 1

        elif etype == "Pass":
            p = ev.get("pass", {})
            passes_attempted += 1
            outcome_obj = p.get("outcome")
            outcome = outcome_obj.get("name") if isinstance(outcome_obj, dict) else outcome_obj
            if outcome is None:
                passes_completed += 1

            if p.get("goal_assist"):
                assists += 1
                key_passes += 1
            elif p.get("shot_assist"):
                key_passes += 1

            if p.get("cross"):
                crosses += 1

        elif etype == "Duel":
            d = ev.get("duel", {})
            dtype = d.get("type", {}).get("name", "")
            outcome = d.get("outcome", {}).get("name", "")
            if "Tackle" in dtype:
                tackles += 1
            if outcome in ("Won", "Success"):
                duels_won += 1
            if dtype == "Aerial Lost":
                pass
            elif "Aerial" in dtype and outcome in ("Won", "Success"):
                aerials_won += 1

        elif etype == "Interception":
            interceptions += 1

        elif etype == "Clearance":
            clearances += 1

        elif etype == "Foul Committed":
            fouls_committed += 1
            card = ev.get("foul_committed", {}).get("card", {}).get("name")
            if card in ("Yellow Card", "Second Yellow"):
                yellow_cards += 1
            elif card == "Red Card":
                red_cards += 1

        elif etype == "Bad Behaviour":
            card = ev.get("bad_behaviour", {}).get("card", {}).get("name")
            if card in ("Yellow Card", "Second Yellow"):
                yellow_cards += 1
            elif card == "Red Card":
                red_cards += 1

        elif etype == "Foul Won":
            fouls_won += 1

        elif etype == "Dribble":
            dr = ev.get("dribble", {})
            if dr.get("outcome", {}).get("name") == "Complete":
                dribbles_completed += 1

        elif etype == "Pressure":
            pressures += 1

        elif etype == "Carry":
            carries += 1

    detailed = {
        "pressures": pressures,
        "carries": carries,
        "crosses": crosses,
    }

    return {
        "player_id": player_id,
        "match_id": match_id,
        "team_id": team_id,
        "minutes_played": appearance_minutes,
        "goals": goals,
        "assists": assists,
        "shots": shots,
        "shots_on_target": shots_on_target,
        "passes_attempted": passes_attempted,
        "passes_completed": passes_completed,
        "key_passes": key_passes,
        "tackles": tackles,
        "interceptions": interceptions,
        "clearances": clearances,
        "fouls_committed": fouls_committed,
        "fouls_won": fouls_won,
        "yellow_cards": yellow_cards,
        "red_cards": red_cards,
        "aerials_won": aerials_won,
        "dribbles_completed": dribbles_completed,
        "duels_won": duels_won,
        "touches": touches,
        "xg": round(total_xg, 3) if total_xg > 0 else 0.0,
        "xa": round(total_xa, 3) if total_xa > 0 else 0.0,
        "detailed_stats": detailed,
    }
