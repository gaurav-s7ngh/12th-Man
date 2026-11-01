import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatP90(val?: number): string {
  if (val === undefined || val === null) return "0.00";
  return val.toFixed(2);
}

export function formatPct(val?: number): string {
  if (val === undefined || val === null) return "0.0%";
  return `${val.toFixed(1)}%`;
}

export function getPositionBadgeClass(position?: string): string {
  if (!position) return "bg-zinc-800 text-zinc-400 border-zinc-700";
  const p = position.toLowerCase();
  if (p.includes("forward") || p.includes("wing") || p.includes("striker")) {
    return "bg-rose-950/60 text-rose-400 border-rose-800/50";
  }
  if (p.includes("midfield")) {
    return "bg-emerald-950/60 text-emerald-400 border-emerald-800/50";
  }
  if (p.includes("back") || p.includes("defender")) {
    return "bg-sky-950/60 text-sky-400 border-sky-800/50";
  }
  if (p.includes("goalkeeper")) {
    return "bg-amber-950/60 text-amber-400 border-amber-800/50";
  }
  return "bg-zinc-800 text-zinc-300 border-zinc-700";
}
