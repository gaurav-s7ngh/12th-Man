export type CanonicalPosition =
  | "Goalkeeper"
  | "Defender"
  | "Midfielder"
  | "Winger"
  | "Forward";

export type PositionCode = "GK" | "DEF" | "MID" | "WNG" | "FWD";

export const CANONICAL_GROUPS: { group: CanonicalPosition; code: PositionCode; label: string }[] = [
  { group: "Goalkeeper", code: "GK", label: "Goalkeepers" },
  { group: "Defender", code: "DEF", label: "Defenders" },
  { group: "Midfielder", code: "MID", label: "Midfielders" },
  { group: "Winger", code: "WNG", label: "Wingers" },
  { group: "Forward", code: "FWD", label: "Forwards" },
];

export const POSITION_TO_GROUP: Record<string, CanonicalPosition> = {
  // Goalkeeper: GK
  "Goalkeeper": "Goalkeeper",
  "GK": "Goalkeeper",
  "Keeper": "Goalkeeper",

  // Defender: CB, LCB, RCB, LB, RB, LWB, RWB
  "Center Back": "Defender",
  "Centre Back": "Defender",
  "CB": "Defender",
  "Left Center Back": "Defender",
  "Left Centre Back": "Defender",
  "LCB": "Defender",
  "Right Center Back": "Defender",
  "Right Centre Back": "Defender",
  "RCB": "Defender",
  "Left Back": "Defender",
  "LB": "Defender",
  "Right Back": "Defender",
  "RB": "Defender",
  "Left Wing Back": "Defender",
  "LWB": "Defender",
  "Right Wing Back": "Defender",
  "RWB": "Defender",
  "Defender": "Defender",

  // Midfielder: CDM, DM, CM, LCM, RCM, CAM, AM, LM, RM
  "Center Defensive Midfield": "Midfielder",
  "Defensive Midfield": "Midfielder",
  "CDM": "Midfielder",
  "DM": "Midfielder",
  "Left Defensive Midfield": "Midfielder",
  "LDM": "Midfielder",
  "Right Defensive Midfield": "Midfielder",
  "RDM": "Midfielder",
  "Center Midfield": "Midfielder",
  "CM": "Midfielder",
  "Left Center Midfield": "Midfielder",
  "LCM": "Midfielder",
  "Right Center Midfield": "Midfielder",
  "RCM": "Midfielder",
  "Center Attacking Midfield": "Midfielder",
  "Attacking Midfield": "Midfielder",
  "CAM": "Midfielder",
  "AM": "Midfielder",
  "Left Attacking Midfield": "Midfielder",
  "LAM": "Midfielder",
  "Right Attacking Midfield": "Midfielder",
  "RAM": "Midfielder",
  "Left Midfield": "Midfielder",
  "LM": "Midfielder",
  "Right Midfield": "Midfielder",
  "RM": "Midfielder",
  "Midfielder": "Midfielder",

  // Winger: LW, RW, LWF, RWF
  "Left Wing": "Winger",
  "LW": "Winger",
  "Right Wing": "Winger",
  "RW": "Winger",
  "Left Wing Forward": "Winger",
  "LWF": "Winger",
  "Right Wing Forward": "Winger",
  "RWF": "Winger",
  "Winger": "Winger",

  // Forward: ST, CF, SS, LF, RF
  "Center Forward": "Forward",
  "Centre Forward": "Forward",
  "CF": "Forward",
  "Striker": "Forward",
  "ST": "Forward",
  "Left Center Forward": "Forward",
  "LCF": "Forward",
  "Right Center Forward": "Forward",
  "RCF": "Forward",
  "Left Forward": "Forward",
  "LF": "Forward",
  "Right Forward": "Forward",
  "RF": "Forward",
  "Secondary Striker": "Forward",
  "Second Striker": "Forward",
  "SS": "Forward",
  "Forward": "Forward",
};

/**
 * Normalizes any position string to one of the 5 canonical groups.
 */
export function normalizePosition(pos?: string | null): CanonicalPosition | null {
  if (!pos || !pos.trim() || pos === "Not recorded" || pos === "Unassigned" || pos === "None") {
    return null;
  }
  const clean = pos.trim();
  if (POSITION_TO_GROUP[clean]) {
    return POSITION_TO_GROUP[clean];
  }
  const lower = clean.toLowerCase();
  for (const [key, group] of Object.entries(POSITION_TO_GROUP)) {
    if (key.toLowerCase() === lower) {
      return group;
    }
  }
  if (lower.includes("goalkeeper") || lower === "gk") return "Goalkeeper";
  if (lower.includes("wing back") || lower.includes("back")) return "Defender";
  if (lower.includes("midfield") || ["lm", "rm", "cm", "dm", "am"].includes(lower)) return "Midfielder";
  if (lower.includes("wing") || ["lw", "rw"].includes(lower)) return "Winger";
  if (lower.includes("forward") || lower.includes("striker") || ["st", "cf"].includes(lower)) return "Forward";
  return null;
}

/**
 * Maps position to a 3-letter code for UI badges.
 */
export function getPositionCode(pos?: string | null): PositionCode | "UNRECORDED" {
  const group = normalizePosition(pos);
  switch (group) {
    case "Goalkeeper":
      return "GK";
    case "Defender":
      return "DEF";
    case "Midfielder":
      return "MID";
    case "Winger":
      return "WNG";
    case "Forward":
      return "FWD";
    default:
      return "UNRECORDED";
  }
}

/**
 * Standard playing time display formatter.
 * Produces clean string e.g. "1,842 minutes" or "0 minutes".
 */
export function formatMinutes(mins?: number | null): string {
  if (mins === undefined || mins === null || isNaN(mins)) {
    return "0 minutes";
  }
  return `${mins.toLocaleString()} minutes`;
}
