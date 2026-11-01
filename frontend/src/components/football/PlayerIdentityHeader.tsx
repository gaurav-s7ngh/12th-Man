import React from "react";
import type { PlayerDetail } from "../../types/football";
import { PositionBadge } from "./PositionBadge";
import { Shield, Clock, Award, Activity } from "lucide-react";

interface PlayerIdentityHeaderProps {
  player: PlayerDetail;
  actions?: React.ReactNode;
}

export const PlayerIdentityHeader: React.FC<PlayerIdentityHeaderProps> = ({
  player,
  actions,
}) => {
  return (
    <div className="rounded-lg bg-[#0D1C15] border border-[#1D3025] p-5 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left: Avatar & Bio */}
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-16 h-16 rounded-lg bg-[#12251B] border border-[#1D3025] flex items-center justify-center font-mono text-2xl text-[#10B981] font-bold shadow-inner">
            {player.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl md:text-2xl font-bold font-mono text-[#E8EDE9] tracking-tight">
                {player.name}
              </h1>
              <PositionBadge position={player.primary_position} />
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-mono text-[#87958B] mt-2">
              <span className="flex items-center gap-1">
                <span>Nationality:</span>
                <strong className="text-[#E8EDE9] font-medium">
                  {player.nationality || "Not recorded"}
                </strong>
              </span>

              <span className="flex items-center gap-1">
                <Shield className="h-3 w-3 text-[#10B981]" />
                <span>Squad:</span>
                <strong className="text-[#E8EDE9] font-medium">
                  {player.teams.map((t) => t.name).join(", ") || "National Squad"}
                </strong>
              </span>

              {player.birth_date && (
                <span className="flex items-center gap-1">
                  <span>DOB:</span>
                  <strong className="text-[#E8EDE9] font-medium">{player.birth_date}</strong>
                </span>
              )}

              {player.height && (
                <span className="flex items-center gap-1">
                  <span>Height:</span>
                  <strong className="text-[#E8EDE9] font-medium">{player.height} cm</strong>
                </span>
              )}

              {player.preferred_foot && (
                <span className="flex items-center gap-1">
                  <span>Foot:</span>
                  <strong className="text-[#E8EDE9] font-medium">{player.preferred_foot}</strong>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center / Right: Tournament Summary Pills & Action Buttons */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded bg-[#080F0B] border border-[#1D3025] text-center">
              <div className="text-[9px] font-mono uppercase text-[#87958B] flex items-center justify-center gap-1">
                <Activity className="h-2.5 w-2.5 text-[#10B981]" />
                Matches
              </div>
              <div className="text-sm font-mono font-bold text-[#10B981] tabular-nums mt-0.5">
                {player.appearances_count}
              </div>
            </div>

            <div className="px-3 py-1.5 rounded bg-[#080F0B] border border-[#1D3025] text-center">
              <div className="text-[9px] font-mono uppercase text-[#87958B] flex items-center justify-center gap-1">
                <Clock className="h-2.5 w-2.5 text-[#10B981]" />
                Minutes
              </div>
              <div className="text-sm font-mono font-bold text-[#E8EDE9] tabular-nums mt-0.5">
                {player.total_minutes}'
              </div>
            </div>

            {player.aggregated_stats && (
              <div className="px-3 py-1.5 rounded bg-[#080F0B] border border-[#1D3025] text-center">
                <div className="text-[9px] font-mono uppercase text-[#87958B] flex items-center justify-center gap-1">
                  <Award className="h-2.5 w-2.5 text-[#10B981]" />
                  G / A
                </div>
                <div className="text-sm font-mono font-bold text-[#E8EDE9] tabular-nums mt-0.5">
                  {player.aggregated_stats.goals} / {player.aggregated_stats.assists}
                </div>
              </div>
            )}
          </div>

          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </div>
    </div>
  );
};
