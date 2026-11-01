import type { Player } from "../../types/football";

export interface PitchPositionSlot {
  slotId: string;
  roleName: string;
  category: "GK" | "DEF" | "MID" | "FWD";
  x: number; // 0 to 100 (% of pitch width)
  y: number; // 0 to 100 (% of pitch height)
  player?: Player;
  jerseyNumber?: number;
}

export type FormationKey = "4-3-3" | "4-2-3-1" | "3-4-2-1" | "5-3-2";

export const FORMATION_SLOTS: Record<FormationKey, Omit<PitchPositionSlot, "player">[]> = {
  "4-3-3": [
    { slotId: "gk", roleName: "Goalkeeper", category: "GK", x: 50, y: 8 },
    { slotId: "lb", roleName: "Left Back", category: "DEF", x: 15, y: 26 },
    { slotId: "lcb", roleName: "Left Center Back", category: "DEF", x: 38, y: 23 },
    { slotId: "rcb", roleName: "Right Center Back", category: "DEF", x: 62, y: 23 },
    { slotId: "rb", roleName: "Right Back", category: "DEF", x: 85, y: 26 },
    { slotId: "cdm", roleName: "Defensive Midfield", category: "MID", x: 50, y: 44 },
    { slotId: "lcm", roleName: "Left Central Midfield", category: "MID", x: 32, y: 56 },
    { slotId: "rcm", roleName: "Right Central Midfield", category: "MID", x: 68, y: 56 },
    { slotId: "lw", roleName: "Left Wing", category: "FWD", x: 18, y: 78 },
    { slotId: "st", roleName: "Center Forward", category: "FWD", x: 50, y: 86 },
    { slotId: "rw", roleName: "Right Wing", category: "FWD", x: 82, y: 78 },
  ],
  "4-2-3-1": [
    { slotId: "gk", roleName: "Goalkeeper", category: "GK", x: 50, y: 8 },
    { slotId: "lb", roleName: "Left Back", category: "DEF", x: 15, y: 25 },
    { slotId: "lcb", roleName: "Left Center Back", category: "DEF", x: 38, y: 22 },
    { slotId: "rcb", roleName: "Right Center Back", category: "DEF", x: 62, y: 22 },
    { slotId: "rb", roleName: "Right Back", category: "DEF", x: 85, y: 25 },
    { slotId: "ldm", roleName: "Left Pivot", category: "MID", x: 36, y: 43 },
    { slotId: "rdm", roleName: "Right Pivot", category: "MID", x: 64, y: 43 },
    { slotId: "lam", roleName: "Left Attacking Mid", category: "MID", x: 20, y: 66 },
    { slotId: "cam", roleName: "Attacking Midfielder", category: "MID", x: 50, y: 68 },
    { slotId: "ram", roleName: "Right Attacking Mid", category: "MID", x: 80, y: 66 },
    { slotId: "st", roleName: "Center Forward", category: "FWD", x: 50, y: 87 },
  ],
  "3-4-2-1": [
    { slotId: "gk", roleName: "Goalkeeper", category: "GK", x: 50, y: 8 },
    { slotId: "lcb", roleName: "Left Center Back", category: "DEF", x: 26, y: 24 },
    { slotId: "cb", roleName: "Central Defender", category: "DEF", x: 50, y: 21 },
    { slotId: "rcb", roleName: "Right Center Back", category: "DEF", x: 74, y: 24 },
    { slotId: "lwb", roleName: "Left Wing Back", category: "DEF", x: 12, y: 48 },
    { slotId: "lcm", roleName: "Central Midfield", category: "MID", x: 38, y: 48 },
    { slotId: "rcm", roleName: "Central Midfield", category: "MID", x: 62, y: 48 },
    { slotId: "rwb", roleName: "Right Wing Back", category: "DEF", x: 88, y: 48 },
    { slotId: "lam", roleName: "Left Inside Forward", category: "FWD", x: 32, y: 72 },
    { slotId: "ram", roleName: "Right Inside Forward", category: "FWD", x: 68, y: 72 },
    { slotId: "st", roleName: "Center Forward", category: "FWD", x: 50, y: 88 },
  ],
  "5-3-2": [
    { slotId: "gk", roleName: "Goalkeeper", category: "GK", x: 50, y: 8 },
    { slotId: "lwb", roleName: "Left Wing Back", category: "DEF", x: 14, y: 32 },
    { slotId: "lcb", roleName: "Left Center Back", category: "DEF", x: 32, y: 22 },
    { slotId: "cb", roleName: "Sweeper / Central", category: "DEF", x: 50, y: 20 },
    { slotId: "rcb", roleName: "Right Center Back", category: "DEF", x: 68, y: 22 },
    { slotId: "rwb", roleName: "Right Wing Back", category: "DEF", x: 86, y: 32 },
    { slotId: "lcm", roleName: "Left Midfielder", category: "MID", x: 32, y: 54 },
    { slotId: "cm", roleName: "Holding Midfield", category: "MID", x: 50, y: 50 },
    { slotId: "rcm", roleName: "Right Midfielder", category: "MID", x: 68, y: 54 },
    { slotId: "lcf", roleName: "Left Striker", category: "FWD", x: 38, y: 82 },
    { slotId: "rcf", roleName: "Right Striker", category: "FWD", x: 62, y: 82 },
  ],
};
