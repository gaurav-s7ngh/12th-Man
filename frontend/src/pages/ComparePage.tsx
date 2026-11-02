import React, { useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import { PageHeader } from "../components/layout/PageHeader";
import { SectionHeader } from "../components/layout/SectionHeader";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { PositionBadge } from "../components/football/PositionBadge";
import { formatMinutes } from "../lib/utils";
import { RadarComparisonChart, type RadarDataPoint } from "../components/football/RadarComparisonChart";
import { formatP90, formatPct, getPositionCategory } from "../lib/utils";
import { AlertTriangle, ArrowUpRight } from "lucide-react";

export const ComparePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const urlPlayerA = searchParams.get("playerA") || "";
  const urlPlayerB = searchParams.get("playerB") || "";

  const [playerAId, setPlayerAId] = useState<string>(urlPlayerA);
  const [playerBId, setPlayerBId] = useState<string>(urlPlayerB);

  // Load players for selection pool
  const { data: playersPool } = useQuery({
    queryKey: ["comparePlayersPool"],
    queryFn: () => api.getPlayers({ page: 1, page_size: 60 }),
  });

  // Derived effective IDs to prevent setState inside effects
  const effectivePlayerAId = useMemo(() => {
    if (playerAId) return playerAId;
    if (urlPlayerA) return urlPlayerA;
    if (playersPool?.items && playersPool.items.length >= 1) {
      return playersPool.items[0].id;
    }
    return "";
  }, [playerAId, urlPlayerA, playersPool]);

  const effectivePlayerBId = useMemo(() => {
    if (playerBId) return playerBId;
    if (urlPlayerB) return urlPlayerB;
    if (playersPool?.items && playersPool.items.length >= 2) {
      return playersPool.items[1].id;
    }
    return "";
  }, [playerBId, urlPlayerB, playersPool]);

  // Load Player A detail
  const { data: playerA, isLoading: loadingA } = useQuery({
    queryKey: ["comparePlayerA", effectivePlayerAId],
    queryFn: () => (effectivePlayerAId ? api.getPlayer(effectivePlayerAId) : Promise.resolve(null)),
    enabled: !!effectivePlayerAId,
  });

  // Load Player B detail
  const { data: playerB, isLoading: loadingB } = useQuery({
    queryKey: ["comparePlayerB", effectivePlayerBId],
    queryFn: () => (effectivePlayerBId ? api.getPlayer(effectivePlayerBId) : Promise.resolve(null)),
    enabled: !!effectivePlayerBId,
  });

  const aggA = playerA?.aggregated_stats;
  const aggB = playerB?.aggregated_stats;

  // Radar chart data comparison (0-100 normalized score for visualization)
  const radarData: RadarDataPoint[] = useMemo(() => {
    if (!aggA || !aggB) return [];

    return [
      {
        subject: "Finishing (xG/90)",
        playerA: Math.min(100, Math.round(aggA.xg_per_90 * 120)),
        playerB: Math.min(100, Math.round(aggB.xg_per_90 * 120)),
      },
      {
        subject: "Playmaking (KeyP/90)",
        playerA: Math.min(100, Math.round(aggA.key_passes_per_90 * 35)),
        playerB: Math.min(100, Math.round(aggB.key_passes_per_90 * 35)),
      },
      {
        subject: "Pass Acc (%)",
        playerA: Math.round(aggA.pass_completion_pct),
        playerB: Math.round(aggB.pass_completion_pct),
      },
      {
        subject: "Tackling (Tack/90)",
        playerA: Math.min(100, Math.round(aggA.tackles_per_90 * 30)),
        playerB: Math.min(100, Math.round(aggB.tackles_per_90 * 30)),
      },
      {
        subject: "Interceptions/90",
        playerA: Math.min(100, Math.round(aggA.interceptions_per_90 * 35)),
        playerB: Math.min(100, Math.round(aggB.interceptions_per_90 * 35)),
      },
      {
        subject: "Volume (Touch/90)",
        playerA: Math.min(100, Math.round(((aggA.touches / Math.max(1, aggA.total_minutes)) * 90) / 1.2)),
        playerB: Math.min(100, Math.round(((aggB.touches / Math.max(1, aggB.total_minutes)) * 90) / 1.2)),
      },
    ];
  }, [aggA, aggB]);

  // Check for disparity caveats
  const minutesDiff = Math.abs((playerA?.total_minutes || 0) - (playerB?.total_minutes || 0));
  const hasLowMinutes = (playerA?.total_minutes || 0) < 180 || (playerB?.total_minutes || 0) < 180;
  const differentPositions =
    getPositionCategory(playerA?.primary_position) !==
    getPositionCategory(playerB?.primary_position);

  // Metrics comparison list
  const metricsComparison = [
    { label: "Goals / 90", a: aggA?.goals_per_90, b: aggB?.goals_per_90, isP90: true },
    { label: "Assists / 90", a: aggA?.assists_per_90, b: aggB?.assists_per_90, isP90: true },
    { label: "Expected Goals (xG) / 90", a: aggA?.xg_per_90, b: aggB?.xg_per_90, isP90: true },
    { label: "Expected Assists (xA) / 90", a: aggA?.xa_per_90, b: aggB?.xa_per_90, isP90: true },
    { label: "Key Passes / 90", a: aggA?.key_passes_per_90, b: aggB?.key_passes_per_90, isP90: true },
    { label: "Pass Completion %", a: aggA?.pass_completion_pct, b: aggB?.pass_completion_pct, isPct: true },
    { label: "Tackles / 90", a: aggA?.tackles_per_90, b: aggB?.tackles_per_90, isP90: true },
    { label: "Interceptions / 90", a: aggA?.interceptions_per_90, b: aggB?.interceptions_per_90, isP90: true },
    { label: "Total Minutes", a: playerA?.total_minutes, b: playerB?.total_minutes, isRaw: true },
    { label: "Tournament Starts", a: aggA?.starts, b: aggB?.starts, isRaw: true },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Comparative Talent Analysis"
        title="Side-by-Side Player Comparison"
        description="Normalized per-90 performance telemetry, positional role alignment, and radar comparison between tournament candidates."
      />

      {/* Disparity Alert Banner */}
      {(hasLowMinutes || minutesDiff > 350 || differentPositions) && (
        <div className="p-3.5 rounded-lg bg-[#12251B] border border-[#F59E0B]/40 font-mono text-xs flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-[#F59E0B] flex-shrink-0 mt-0.5" />
          <div className="space-y-1 text-[11px] leading-relaxed">
            <span className="font-bold text-[#E8EDE9] uppercase tracking-wider block">
              Statistical Context Advisory:
            </span>
            {hasLowMinutes && (
              <p className="text-[#87958B]">
                • One or both players have logged under 180 tournament minutes. Per-90 normalized metrics can be sensitive to small sample sizes.
              </p>
            )}
            {differentPositions && (
              <p className="text-[#87958B]">
                • Players occupy different tactical positional categories ({getPositionCategory(playerA?.primary_position)} vs {getPositionCategory(playerB?.primary_position)}). Direct metrics should be evaluated with role expectations in mind.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Selector and Identity Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Player A Selection & Identity */}
        <div className="rounded-lg bg-[#0D1C15] border border-[#1D3025] p-4 font-mono text-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#1D3025]">
            <span className="text-[10px] uppercase text-[#10B981] font-bold">Candidate A</span>
            <select
              value={effectivePlayerAId}
              onChange={(e) => setPlayerAId(e.target.value)}
              className="bg-[#080F0B] border border-[#1D3025] rounded px-2.5 py-1 text-xs text-[#E8EDE9] focus:border-[#10B981] focus:outline-none cursor-pointer max-w-[200px] truncate"
            >
              {playersPool?.items.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.nationality || "—"})
                </option>
              ))}
            </select>
          </div>

          {loadingA ? (
            <LoadingSpinner message="Loading candidate A..." />
          ) : playerA ? (
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded bg-[#12251B] border border-[#10B981]/50 flex items-center justify-center font-bold text-sm text-[#10B981] flex-shrink-0">
                  {playerA.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <Link
                    to={`/players/${playerA.id}`}
                    className="font-bold text-sm text-[#E8EDE9] hover:text-[#10B981] transition-colors truncate block flex items-center gap-1"
                  >
                    <span className="truncate">{playerA.name}</span>
                    <ArrowUpRight className="h-3 w-3 text-[#87958B]" />
                  </Link>
                  <div className="text-[11px] text-[#87958B] mt-0.5">
                    {playerA.nationality || "—"} • {formatMinutes(playerA.total_minutes)}
                  </div>
                </div>
              </div>
              <PositionBadge position={playerA.primary_position} />
            </div>
          ) : null}
        </div>

        {/* Player B Selection & Identity */}
        <div className="rounded-lg bg-[#0D1C15] border border-[#1D3025] p-4 font-mono text-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#1D3025]">
            <span className="text-[10px] uppercase text-[#38BDF8] font-bold">Candidate B</span>
            <select
              value={effectivePlayerBId}
              onChange={(e) => setPlayerBId(e.target.value)}
              className="bg-[#080F0B] border border-[#1D3025] rounded px-2.5 py-1 text-xs text-[#E8EDE9] focus:border-[#38BDF8] focus:outline-none cursor-pointer max-w-[200px] truncate"
            >
              {playersPool?.items.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.nationality || "—"})
                </option>
              ))}
            </select>
          </div>

          {loadingB ? (
            <LoadingSpinner message="Loading candidate B..." />
          ) : playerB ? (
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded bg-[#0b1b24] border border-[#38BDF8]/50 flex items-center justify-center font-bold text-sm text-[#38BDF8] flex-shrink-0">
                  {playerB.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <Link
                    to={`/players/${playerB.id}`}
                    className="font-bold text-sm text-[#E8EDE9] hover:text-[#38BDF8] transition-colors truncate block flex items-center gap-1"
                  >
                    <span className="truncate">{playerB.name}</span>
                    <ArrowUpRight className="h-3 w-3 text-[#87958B]" />
                  </Link>
                  <div className="text-[11px] text-[#87958B] mt-0.5">
                    {playerB.nationality || "—"} • {formatMinutes(playerB.total_minutes)}
                  </div>
                </div>
              </div>
              <PositionBadge position={playerB.primary_position} />
            </div>
          ) : null}
        </div>
      </div>

      {/* Main Comparison Section: Radar + Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Radar Comparison Chart (5 Cols) */}
        <div className="lg:col-span-5 rounded-lg bg-[#0D1C15] border border-[#1D3025] p-5 flex flex-col justify-between">
          <SectionHeader
            title="Multidimensional Radar Profile"
            subtitle="Normalized composite dimensions"
          />

          <div className="my-auto py-2">
            <RadarComparisonChart
              data={radarData}
              playerAName={playerA?.name || "Player A"}
              playerBName={playerB?.name || "Player B"}
            />
          </div>

          <div className="mt-4 p-2.5 rounded bg-[#080F0B] border border-[#1D3025] text-[10px] font-mono text-[#87958B] text-center">
            Green: {playerA?.name || "Player A"} • Cyan: {playerB?.name || "Player B"}
          </div>
        </div>

        {/* Statistical Metrics Delta Table (7 Cols) */}
        <div className="lg:col-span-7 rounded-lg bg-[#0D1C15] border border-[#1D3025] p-5">
          <SectionHeader
            title="Per-90 Statistical Comparison"
            subtitle="Granular event metrics normalized across tournament playing time"
          />

          <div className="overflow-x-auto mt-3">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#080F0B] border-b border-[#1D3025] text-[#87958B] text-[10px] uppercase">
                <tr>
                  <th className="py-2.5 px-3">Metric</th>
                  <th className="py-2.5 px-3 text-right text-[#10B981]">
                    {playerA?.name?.split(" ").slice(-1)[0] || "A"}
                  </th>
                  <th className="py-2.5 px-3 text-center">Delta</th>
                  <th className="py-2.5 px-3 text-left text-[#38BDF8]">
                    {playerB?.name?.split(" ").slice(-1)[0] || "B"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1D3025]/60">
                {metricsComparison.map((m, idx) => {
                  const valA = m.a ?? 0;
                  const valB = m.b ?? 0;
                  const diff = valA - valB;

                  const displayA = m.isPct ? formatPct(valA) : m.isP90 ? formatP90(valA) : valA;
                  const displayB = m.isPct ? formatPct(valB) : m.isP90 ? formatP90(valB) : valB;

                  return (
                    <tr key={idx} className="hover:bg-[#12251B]/50 transition-colors">
                      <td className="py-2.5 px-3 text-[#E8EDE9] font-medium">{m.label}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-[#E8EDE9] tabular-nums">
                        {displayA}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-semibold tabular-nums ${
                            diff > 0
                              ? "text-[#10B981] bg-[#10B981]/10"
                              : diff < 0
                              ? "text-[#38BDF8] bg-[#38BDF8]/10"
                              : "text-[#87958B]"
                          }`}
                        >
                          {diff > 0 ? `+${diff.toFixed(2)}` : diff < 0 ? diff.toFixed(2) : "="}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-left font-bold text-[#E8EDE9] tabular-nums">
                        {displayB}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
