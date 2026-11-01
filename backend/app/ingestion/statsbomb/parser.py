from datetime import date, datetime
from typing import Any, Dict, List, Optional, Tuple


def parse_match_date(date_str: str, time_str: Optional[str] = None) -> Tuple[date, Optional[datetime]]:
    d = datetime.strptime(date_str, "%Y-%m-%d").date()
    dt = None
    if time_str:
        try:
            full_str = f"{date_str} {time_str}"
            # Time can be HH:MM:SS or HH:MM:SS.mmm
            if "." in time_str:
                dt = datetime.strptime(full_str, "%Y-%m-%d %H:%M:%S.%f")
            else:
                dt = datetime.strptime(full_str, "%Y-%m-%d %H:%M:%S")
        except Exception:
            pass
    return d, dt


def calculate_minutes_from_positions(positions: List[Dict[str, Any]], match_duration: int = 90) -> int:
    """
    Computes total minutes played from lineup positions.
    """
    if not positions:
        return 0

    total_seconds = 0
    for pos in positions:
        from_str = pos.get("from", "00:00")
        to_str = pos.get("to")

        def time_to_sec(t_str: Optional[str]) -> int:
            if not t_str:
                return match_duration * 60
            parts = t_str.split(":")
            if len(parts) == 2:
                return int(parts[0]) * 60 + int(parts[1])
            elif len(parts) == 3:
                return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
            return 0

        start_sec = time_to_sec(from_str)
        end_sec = time_to_sec(to_str)
        total_seconds += max(0, end_sec - start_sec)

    return min(120, round(total_seconds / 60))


def extract_event_attributes(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extracts structured attributes from StatsBomb event for quick querying.
    """
    attrs: Dict[str, Any] = {}
    event_type = event.get("type", {}).get("name")

    if event_type == "Shot":
        shot = event.get("shot", {})
        attrs["xg"] = shot.get("statsbomb_xg")
        attrs["outcome"] = shot.get("outcome", {}).get("name")
        attrs["technique"] = shot.get("technique", {}).get("name")
        attrs["body_part"] = shot.get("body_part", {}).get("name")
        attrs["key_pass_id"] = shot.get("key_pass_id")

    elif event_type == "Pass":
        p = event.get("pass", {})
        attrs["length"] = p.get("length")
        attrs["angle"] = p.get("angle")
        attrs["recipient"] = p.get("recipient", {}).get("name")
        attrs["recipient_id"] = p.get("recipient", {}).get("id")
        attrs["height"] = p.get("height", {}).get("name")
        attrs["outcome"] = p.get("outcome", {}).get("name")  # None means complete
        attrs["is_cross"] = p.get("cross", False)
        attrs["is_through_ball"] = p.get("through_ball", False)
        attrs["shot_assist"] = p.get("shot_assist", False)
        attrs["goal_assist"] = p.get("goal_assist", False)

    elif event_type == "Duel":
        d = event.get("duel", {})
        attrs["type"] = d.get("type", {}).get("name")
        attrs["outcome"] = d.get("outcome", {}).get("name")

    elif event_type == "Dribble":
        dr = event.get("dribble", {})
        attrs["outcome"] = dr.get("outcome", {}).get("name")
        attrs["overrun"] = dr.get("overrun", False)

    elif event_type == "Interception":
        inter = event.get("interception", {})
        attrs["outcome"] = inter.get("outcome", {}).get("name")

    elif event_type in ("Foul Committed", "Bad Behaviour"):
        fc = event.get("foul_committed", {}) or event.get("bad_behaviour", {})
        if "card" in fc:
            attrs["card"] = fc.get("card", {}).get("name")

    return attrs
