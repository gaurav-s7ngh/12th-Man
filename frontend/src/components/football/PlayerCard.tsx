import React from "react";
import { Link } from "react-router-dom";
import type { Player } from "../../types/football";
import { PositionBadge } from "./PositionBadge";
import { ArrowUpRight } from "lucide-react";

interface PlayerCardProps {
  player: Player;
  subtitle?: string;
  metrics?: { label: string; value: string | number }[];
  actionSlot?: React.ReactNode;
  className?: string;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  subtitle,
  metrics,
  actionSlot,
  className,
}) => {
  return (
    <div
      className={`rounded bg-[#0D1C15] border border-[#1D3025] hover:border-[#10B981]/40 p-3.5 transition-all group ${
        className || ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          {/* Avatar initials */}
          <div className="w-8 h-8 rounded bg-[#12251B] border border-[#1D3025] flex items-center justify-center font-mono font-bold text-xs text-[#10B981] flex-shrink-0 group-hover:border-[#10B981]/60 transition-colors">
            {player.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <Link
              to={`/players/${player.id}`}
              className="text-xs font-mono font-bold text-[#E8EDE9] hover:text-[#10B981] transition-colors truncate block flex items-center gap-1"
            >
              <span className="truncate">{player.name}</span>
              <ArrowUpRight className="h-3 w-3 text-[#87958B] group-hover:text-[#10B981] transition-colors flex-shrink-0" />
            </Link>
            <div className="text-[11px] font-mono text-[#87958B] truncate mt-0.5">
              {subtitle || player.nationality || "Unknown"}
            </div>
          </div>
        </div>

        <PositionBadge position={player.primary_position} />
      </div>

      {metrics && metrics.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-[#1D3025]/60 text-center">
          {metrics.map((m, idx) => (
            <div key={idx} className="bg-[#080F0B] rounded px-1.5 py-1 border border-[#1D3025]/40">
              <div className="text-[9px] font-mono uppercase tracking-wider text-[#87958B]">
                {m.label}
              </div>
              <div className="text-xs font-mono font-bold text-[#E8EDE9] tabular-nums mt-0.5">
                {m.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {actionSlot && <div className="mt-2.5 pt-2 border-t border-[#1D3025]/60">{actionSlot}</div>}
    </div>
  );
};
