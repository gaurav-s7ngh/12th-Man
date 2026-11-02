from enum import Enum
from typing import Dict, List, Optional, Set


class CanonicalPositionGroup(str, Enum):
    GOALKEEPER = "Goalkeeper"
    DEFENDER = "Defender"
    MIDFIELDER = "Midfielder"
    WINGER = "Winger"
    FORWARD = "Forward"


# Exact mapping for every StatsBomb position string and common abbreviations
POSITION_TO_CANONICAL: Dict[str, CanonicalPositionGroup] = {
    # 1. Goalkeeper: GK
    "Goalkeeper": CanonicalPositionGroup.GOALKEEPER,
    "GK": CanonicalPositionGroup.GOALKEEPER,
    "Keeper": CanonicalPositionGroup.GOALKEEPER,

    # 2. Defender: CB, LCB, RCB, LB, RB, LWB, RWB
    "Center Back": CanonicalPositionGroup.DEFENDER,
    "Centre Back": CanonicalPositionGroup.DEFENDER,
    "CB": CanonicalPositionGroup.DEFENDER,
    "Left Center Back": CanonicalPositionGroup.DEFENDER,
    "Left Centre Back": CanonicalPositionGroup.DEFENDER,
    "LCB": CanonicalPositionGroup.DEFENDER,
    "Right Center Back": CanonicalPositionGroup.DEFENDER,
    "Right Centre Back": CanonicalPositionGroup.DEFENDER,
    "RCB": CanonicalPositionGroup.DEFENDER,
    "Left Back": CanonicalPositionGroup.DEFENDER,
    "LB": CanonicalPositionGroup.DEFENDER,
    "Right Back": CanonicalPositionGroup.DEFENDER,
    "RB": CanonicalPositionGroup.DEFENDER,
    "Left Wing Back": CanonicalPositionGroup.DEFENDER,
    "LWB": CanonicalPositionGroup.DEFENDER,
    "Right Wing Back": CanonicalPositionGroup.DEFENDER,
    "RWB": CanonicalPositionGroup.DEFENDER,
    "Defender": CanonicalPositionGroup.DEFENDER,

    # 3. Midfielder: CDM, DM, CM, LCM, RCM, CAM, AM, LM, RM
    "Center Defensive Midfield": CanonicalPositionGroup.MIDFIELDER,
    "Defensive Midfield": CanonicalPositionGroup.MIDFIELDER,
    "CDM": CanonicalPositionGroup.MIDFIELDER,
    "DM": CanonicalPositionGroup.MIDFIELDER,
    "Left Defensive Midfield": CanonicalPositionGroup.MIDFIELDER,
    "LDM": CanonicalPositionGroup.MIDFIELDER,
    "Right Defensive Midfield": CanonicalPositionGroup.MIDFIELDER,
    "RDM": CanonicalPositionGroup.MIDFIELDER,
    "Center Midfield": CanonicalPositionGroup.MIDFIELDER,
    "CM": CanonicalPositionGroup.MIDFIELDER,
    "Left Center Midfield": CanonicalPositionGroup.MIDFIELDER,
    "LCM": CanonicalPositionGroup.MIDFIELDER,
    "Right Center Midfield": CanonicalPositionGroup.MIDFIELDER,
    "RCM": CanonicalPositionGroup.MIDFIELDER,
    "Center Attacking Midfield": CanonicalPositionGroup.MIDFIELDER,
    "Attacking Midfield": CanonicalPositionGroup.MIDFIELDER,
    "CAM": CanonicalPositionGroup.MIDFIELDER,
    "AM": CanonicalPositionGroup.MIDFIELDER,
    "Left Attacking Midfield": CanonicalPositionGroup.MIDFIELDER,
    "LAM": CanonicalPositionGroup.MIDFIELDER,
    "Right Attacking Midfield": CanonicalPositionGroup.MIDFIELDER,
    "RAM": CanonicalPositionGroup.MIDFIELDER,
    "Left Midfield": CanonicalPositionGroup.MIDFIELDER,
    "LM": CanonicalPositionGroup.MIDFIELDER,
    "Right Midfield": CanonicalPositionGroup.MIDFIELDER,
    "RM": CanonicalPositionGroup.MIDFIELDER,
    "Midfielder": CanonicalPositionGroup.MIDFIELDER,

    # 4. Winger: LW, RW, LWF, RWF
    "Left Wing": CanonicalPositionGroup.WINGER,
    "LW": CanonicalPositionGroup.WINGER,
    "Right Wing": CanonicalPositionGroup.WINGER,
    "RW": CanonicalPositionGroup.WINGER,
    "Left Wing Forward": CanonicalPositionGroup.WINGER,
    "LWF": CanonicalPositionGroup.WINGER,
    "Right Wing Forward": CanonicalPositionGroup.WINGER,
    "RWF": CanonicalPositionGroup.WINGER,
    "Winger": CanonicalPositionGroup.WINGER,

    # 5. Forward: ST, CF, SS, LF, RF
    "Center Forward": CanonicalPositionGroup.FORWARD,
    "Centre Forward": CanonicalPositionGroup.FORWARD,
    "CF": CanonicalPositionGroup.FORWARD,
    "Striker": CanonicalPositionGroup.FORWARD,
    "ST": CanonicalPositionGroup.FORWARD,
    "Left Center Forward": CanonicalPositionGroup.FORWARD,
    "LCF": CanonicalPositionGroup.FORWARD,
    "Right Center Forward": CanonicalPositionGroup.FORWARD,
    "RCF": CanonicalPositionGroup.FORWARD,
    "Left Forward": CanonicalPositionGroup.FORWARD,
    "LF": CanonicalPositionGroup.FORWARD,
    "Right Forward": CanonicalPositionGroup.FORWARD,
    "RF": CanonicalPositionGroup.FORWARD,
    "Secondary Striker": CanonicalPositionGroup.FORWARD,
    "Second Striker": CanonicalPositionGroup.FORWARD,
    "SS": CanonicalPositionGroup.FORWARD,
    "Forward": CanonicalPositionGroup.FORWARD,
}

# Substring and synonym matching for query parameters
CANONICAL_GROUP_PATTERNS: Dict[CanonicalPositionGroup, List[str]] = {
    CanonicalPositionGroup.GOALKEEPER: [
        "goalkeeper", "gk", "keeper"
    ],
    CanonicalPositionGroup.DEFENDER: [
        "defender", "defenders", "back", "cb", "lcb", "rcb", "lb", "rb", "lwb", "rwb", "wing back"
    ],
    CanonicalPositionGroup.MIDFIELDER: [
        "midfield", "midfielder", "midfielders", "cdm", "dm", "cm", "lcm", "rcm", "cam", "am", "lam", "ram", "lm", "rm"
    ],
    CanonicalPositionGroup.WINGER: [
        "winger", "wingers", "left wing", "right wing", "lw", "rw", "lwf", "rwf"
    ],
    CanonicalPositionGroup.FORWARD: [
        "forward", "forwards", "striker", "strikers", "st", "cf", "ss", "lf", "rf", "center forward", "centre forward"
    ],
}


def normalize_position(position_str: Optional[str]) -> Optional[CanonicalPositionGroup]:
    """Maps any position string to one of the 5 canonical groups."""
    if not position_str or not position_str.strip():
        return None

    cleaned = position_str.strip()
    if cleaned in POSITION_TO_CANONICAL:
        return POSITION_TO_CANONICAL[cleaned]

    # Try case-insensitive lookup
    for key, group in POSITION_TO_CANONICAL.items():
        if key.lower() == cleaned.lower():
            return group

    # Try pattern match
    p_lower = cleaned.lower()
    if "goalkeeper" in p_lower or p_lower == "gk":
        return CanonicalPositionGroup.GOALKEEPER
    if "wing back" in p_lower or "back" in p_lower:
        return CanonicalPositionGroup.DEFENDER
    if "midfield" in p_lower or p_lower in ("lm", "rm", "cm", "dm", "am"):
        return CanonicalPositionGroup.MIDFIELDER
    if "wing" in p_lower or p_lower in ("lw", "rw"):
        return CanonicalPositionGroup.WINGER
    if "forward" in p_lower or "striker" in p_lower or p_lower in ("st", "cf"):
        return CanonicalPositionGroup.FORWARD

    return None


def get_statsbomb_positions_for_group(group: CanonicalPositionGroup) -> List[str]:
    """Returns all exact StatsBomb position labels that belong to a canonical group."""
    return [
        pos for pos, canonical in POSITION_TO_CANONICAL.items()
        if canonical == group and len(pos) > 3  # filter out abbreviations, keep full StatsBomb labels
    ]
