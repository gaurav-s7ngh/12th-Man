import React from "react";
import { formatPosition } from "../../lib/utils";
import type { FormationKey, PitchPositionSlot } from "./formationSlots";

interface TacticalPitchProps {
  formation: FormationKey;
  slots: PitchPositionSlot[];
  selectedPlayerId?: string | null;
  onSelectSlot?: (slot: PitchPositionSlot) => void;
  className?: string;
  readOnly?: boolean;
}

export const TacticalPitch: React.FC<TacticalPitchProps> = ({
  slots,
  selectedPlayerId,
  onSelectSlot,
  className,
}) => {
  return (
    <div
      className={`relative w-full aspect-[4/5] max-w-lg mx-auto rounded-lg border border-[#1D3025] bg-[#07150E] overflow-hidden shadow-2xl select-none ${
        className || ""
      }`}
    >
      {/* SVG Pitch Markings */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-40"
        viewBox="0 0 100 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer boundary */}
        <rect x="5" y="5" width="90" height="110" stroke="#2A4435" strokeWidth="0.8" />

        {/* Halfway line */}
        <line x1="5" y1="60" x2="95" y2="60" stroke="#2A4435" strokeWidth="0.8" />
        <circle cx="50" cy="60" r="10" stroke="#2A4435" strokeWidth="0.8" />
        <circle cx="50" cy="60" r="0.8" fill="#2A4435" />

        {/* Bottom Penalty Box (Defending Goal) */}
        <rect x="25" y="5" width="50" height="20" stroke="#2A4435" strokeWidth="0.8" />
        <rect x="36" y="5" width="28" height="7" stroke="#2A4435" strokeWidth="0.8" />
        <circle cx="50" cy="18" r="0.8" fill="#2A4435" />
        <path d="M 40 25 A 10 10 0 0 0 60 25" stroke="#2A4435" strokeWidth="0.8" />

        {/* Top Penalty Box (Attacking Goal) */}
        <rect x="25" y="95" width="50" height="20" stroke="#2A4435" strokeWidth="0.8" />
        <rect x="36" y="108" width="28" height="7" stroke="#2A4435" strokeWidth="0.8" />
        <circle cx="50" cy="102" r="0.8" fill="#2A4435" />
        <path d="M 40 95 A 10 10 0 0 1 60 95" stroke="#2A4435" strokeWidth="0.8" />

        {/* Corner Arcs */}
        <path d="M 5 8 A 3 3 0 0 0 8 5" stroke="#2A4435" strokeWidth="0.8" />
        <path d="M 95 8 A 3 3 0 0 1 92 5" stroke="#2A4435" strokeWidth="0.8" />
        <path d="M 5 112 A 3 3 0 0 1 8 115" stroke="#2A4435" strokeWidth="0.8" />
        <path d="M 95 112 A 3 3 0 0 0 92 115" stroke="#2A4435" strokeWidth="0.8" />
      </svg>

      {/* Grass subtle striping overlay */}
      <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_20px,rgba(29,48,37,0.12)_20px,rgba(29,48,37,0.12)_40px)] pointer-events-none" />

      {/* Position Nodes */}
      {slots.map((slot) => {
        const isSelected = slot.player && selectedPlayerId === slot.player.id;

        return (
          <button
            key={slot.slotId}
            type="button"
            onClick={() => onSelectSlot && onSelectSlot(slot)}
            style={{
              left: `${slot.x}%`,
              bottom: `${slot.y}%`,
              transform: "translate(-50%, 50%)",
            }}
            className="absolute flex flex-col items-center group cursor-pointer transition-transform hover:scale-110 focus:outline-none z-10"
          >
            {/* Player Marker Dot */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-[11px] font-bold border transition-all ${
                isSelected
                  ? "bg-[#10B981] text-[#050A08] border-[#E8EDE9] shadow-[0_0_12px_rgba(16,185,129,0.5)] scale-110"
                  : slot.player
                  ? "bg-[#12251B] text-[#E8EDE9] border-[#10B981]/50 group-hover:border-[#10B981]"
                  : "bg-[#0D1C15]/80 text-[#87958B] border-dashed border-[#1D3025] group-hover:border-[#87958B]"
              }`}
            >
              {slot.jerseyNumber ? (
                slot.jerseyNumber
              ) : slot.player ? (
                slot.player.name.slice(0, 2).toUpperCase()
              ) : (
                slot.slotId.toUpperCase()
              )}
            </div>

            {/* Player / Slot Name Pill */}
            <div className="mt-1 flex flex-col items-center max-w-[85px]">
              <span
                className={`text-[10px] font-mono font-medium px-1.5 py-0.2 rounded truncate max-w-full text-center transition-colors ${
                  isSelected
                    ? "bg-[#10B981] text-[#050A08] font-bold"
                    : slot.player
                    ? "bg-[#080F0B]/90 text-[#E8EDE9] border border-[#1D3025]"
                    : "bg-[#080F0B]/80 text-[#87958B]"
                }`}
              >
                {slot.player ? slot.player.name.split(" ").slice(-1)[0] : slot.roleName}
              </span>
              <span className="text-[8px] font-mono text-[#87958B]/80 truncate max-w-full">
                {slot.player ? formatPosition(slot.player.primary_position) : slot.slotId.toUpperCase()}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
