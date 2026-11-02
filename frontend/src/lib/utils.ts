import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  getPositionCode,
  normalizePosition,
  formatMinutes,
  type CanonicalPosition,
  type PositionCode,
} from "./positions";

export { formatMinutes, normalizePosition, getPositionCode };
export type { CanonicalPosition, PositionCode };

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatP90(val?: number | null): string {
  if (val === undefined || val === null || isNaN(val)) return "0.00";
  return val.toFixed(2);
}

export function formatPct(val?: number | null): string {
  if (val === undefined || val === null || isNaN(val)) return "0.0%";
  return `${val.toFixed(1)}%`;
}

export function formatNumber(val?: number | null): string {
  if (val === undefined || val === null || isNaN(val)) return "0";
  return val.toLocaleString();
}

/**
 * Format position gracefully.
 * Missing/empty/unspecified positions are labeled as "Not recorded"
 * rather than guessing or fabricating.
 */
export function formatPosition(pos?: string | null): string {
  if (!pos || pos.trim() === "" || pos === "Unspecified" || pos === "None" || pos === "Unassigned") {
    return "Not recorded";
  }
  return pos;
}

export type PositionCategory = PositionCode | "UNRECORDED";

export function getPositionCategory(position?: string | null): PositionCategory {
  return getPositionCode(position);
}

/**
 * Badge styling for position badges using the dark forest green palette with distinct Winger styling.
 */
export function getPositionBadgeClass(position?: string | null): string {
  const cat = getPositionCategory(position);
  switch (cat) {
    case "GK":
      return "bg-[#1f1908] text-amber-400 border border-amber-500/30";
    case "DEF":
      return "bg-[#0b1b24] text-sky-400 border border-sky-500/30";
    case "MID":
      return "bg-[#0c2217] text-emerald-400 border border-emerald-500/30";
    case "WNG":
      return "bg-[#201129] text-purple-300 border border-purple-500/40";
    case "FWD":
      return "bg-[#251014] text-rose-400 border border-rose-500/30";
    case "UNRECORDED":
    default:
      return "bg-[#111814] text-[#87958B] border border-[#1D3025]";
  }
}
