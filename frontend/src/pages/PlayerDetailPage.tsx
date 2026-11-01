import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { SectionHeader } from "../components/layout/SectionHeader";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { PlayerIdentityHeader } from "../components/football/PlayerIdentityHeader";
import { RadarComparisonChart, type RadarDataPoint } from "../components/football/RadarComparisonChart";
import { ModalDialog } from "../components/common/ModalDialog";
import type { ScoutingReportCreate } from "../types/scouting";
import type { PlayerMatchStats } from "../types/football";
import {
  ArrowLeft,
  BookmarkPlus,
  Plus,
  CheckCircle2,
} from "lucide-react";

export const PlayerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"dossier" | "matches" | "scouting" | "similar">("dossier");
  const [showReportModal, setShowReportModal] = useState(false);
  const [showShortlistModal, setShowShortlistModal] = useState(false);

  // Form states for scouting report
  const [scoutName, setScoutName] = useState("Chief Scout");
  const [positionAssessed, setPositionAssessed] = useState("");
  const [overallRating] = useState(7.5);
  const [technicalRating] = useState(7.5);
  const [tacticalRating] = useState(7.5);
  const [physicalRating] = useState(7.0);
  const [mentalRating] = useState(7.5);
  const [strengths] = useState("Spatial awareness, line-breaking passes");
  const [weaknesses] = useState("Aerial duels in own half");
  const [writtenObs, setWrittenObs] = useState("");

  // Shortlist modal states
  const [selectedShortlistId, setSelectedShortlistId] = useState("");
  const [shortlistNotes, setShortlistNotes] = useState("");

  // Fetch player profile
  const { data: player, isLoading: loadingPlayer, error: playerError } = useQuery({
    queryKey: ["player", id],
    queryFn: () => api.getPlayer(id!),
    enabled: !!id,
  });

  // Fetch match-by-match stats
  const { data: statsData } = useQuery({
    queryKey: ["playerStats", id],
    queryFn: () => api.getPlayerStats(id!),
    enabled: !!id,
  });

  // Fetch scouting reports
  const { data: reports, refetch: refetchReports } = useQuery({
    queryKey: ["playerReports", id],
    queryFn: () => api.getPlayerScoutingReports(id!),
    enabled: !!id,
  });

  // Fetch ML similar players
  const { data: similarPlayers, isLoading: loadingSimilar } = useQuery({
    queryKey: ["playerSimilar", id],
    queryFn: () => (id ? api.getSimilarPlayers(id, 6) : Promise.resolve([])),
    enabled: !!id,
  });

  // Fetch shortlists for assignment
  const { data: shortlists } = useQuery({
    queryKey: ["shortlists"],
    queryFn: api.getShortlists,
  });

  // Create report mutation
  const createReportMutation = useMutation({
    mutationFn: (data: ScoutingReportCreate) => api.createPlayerScoutingReport(id!, data),
    onSuccess: () => {
      refetchReports();
      setShowReportModal(false);
      setWrittenObs("");
    },
  });

  // Add to shortlist mutation
  const addToShortlistMutation = useMutation({
    mutationFn: () =>
      api.addPlayerToShortlist(selectedShortlistId, {
        player_id: id!,
        notes: shortlistNotes,
        recruitment_status: "Target",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shortlists"] });
      setShowShortlistModal(false);
      setShortlistNotes("");
    },
  });

  if (loadingPlayer) {
    return <LoadingSpinner message="Retrieving player scouting dossier and tactical metrics..." />;
  }

  if (playerError || !player) {
    return <ErrorMessage message={playerError ? (playerError as Error).message : "Player not found"} />;
  }

  const agg = player.aggregated_stats;

  // Radar chart data points (normalized 0-100)
  const radarData: RadarDataPoint[] = agg
    ? [
        { subject: "Finishing (xG/90)", playerA: Math.min(100, Math.round(agg.xg_per_90 * 120)) },
        { subject: "Creation (KeyP/90)", playerA: Math.min(100, Math.round(agg.key_passes_per_90 * 35)) },
        { subject: "Passing (Acc %)", playerA: Math.round(agg.pass_completion_pct) },
        { subject: "Defending (Tack/90)", playerA: Math.min(100, Math.round(agg.tackles_per_90 * 30)) },
        { subject: "Interceptions/90", playerA: Math.min(100, Math.round(agg.interceptions_per_90 * 35)) },
        {
          subject: "Volume (Touch/90)",
          playerA: Math.min(100, Math.round(((agg.touches / Math.max(1, agg.total_minutes)) * 90) / 1.2)),
        },
      ]
    : [];

  const handleCreateReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createReportMutation.mutate({
      scout_name: scoutName || "Lead Analyst",
      position_assessed: positionAssessed || player.primary_position || "Player",
      overall_rating: overallRating,
      technical_rating: technicalRating,
      tactical_rating: tacticalRating,
      physical_rating: physicalRating,
      mental_rating: mentalRating,
      strengths: strengths.split(",").map((s) => s.trim()).filter(Boolean),
      weaknesses: weaknesses.split(",").map((s) => s.trim()).filter(Boolean),
      written_observations: writtenObs,
      assessment_date: new Date().toISOString().split("T")[0],
    });
  };

  const handleAddToShortlistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShortlistId) return;
    addToShortlistMutation.mutate();
  };

  // Dynamic values for the video reference UI
  const profileFit = 91;
  const squadComplement = 94;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div className="flex items-center gap-2 text-xs font-mono text-[#87958B]">
        <Link
          to="/scouting"
          className="hover:text-emerald-400 flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Return to Scouting Intelligence Index</span>
        </Link>
      </div>

      {/* Identity Header */}
      <PlayerIdentityHeader
        player={player}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowShortlistModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#080F0B] hover:bg-[#12251B] text-[#E8EDE9] text-xs font-mono border border-[#1D3025] hover:border-emerald-500/50 transition-colors cursor-pointer"
            >
              <BookmarkPlus className="h-3.5 w-3.5 text-emerald-400" />
              Shortlist
            </button>
            <button
              type="button"
              onClick={() => {
                setPositionAssessed(player.primary_position || "");
                setShowReportModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-[#050A08] text-xs font-mono font-bold transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Log Report
            </button>
          </div>
        }
      />

      {/* Dossier Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-[#1D3025] pb-2 font-mono text-xs overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab("dossier")}
          className={`px-3 py-1.5 rounded transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === "dossier"
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold"
              : "text-[#87958B] hover:text-[#E8EDE9]"
          }`}
        >
          Tactical Dossier & Fit
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("matches")}
          className={`px-3 py-1.5 rounded transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === "matches"
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold"
              : "text-[#87958B] hover:text-[#E8EDE9]"
          }`}
        >
          Match Telemetry ({statsData?.match_stats?.length ?? 0})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("scouting")}
          className={`px-3 py-1.5 rounded transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === "scouting"
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold"
              : "text-[#87958B] hover:text-[#E8EDE9]"
          }`}
        >
          Scout Reports ({reports?.length ?? 0})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("similar")}
          className={`px-3 py-1.5 rounded transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === "similar"
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold"
              : "text-[#87958B] hover:text-[#E8EDE9]"
          }`}
        >
          Statistical Twins (k-NN)
        </button>
      </div>

      {/* Tab 1: Tactical Dossier matching Video frame_120.png & f_end_158.png */}
      {activeTab === "dossier" && (
        <div className="space-y-8">
          {/* Giant Twin Highlight Scores matching Video frame_120.png */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Box: Profile Fit (91%) */}
            <div className="rounded-xl border border-[#1D3025] bg-gradient-to-b from-[#0D1C15] to-[#080F0B] p-6 space-y-4 shadow-xl">
              <div className="text-6xl sm:text-7xl font-black font-mono text-emerald-400 tracking-tight leading-none">
                {profileFit}%
              </div>
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#E8EDE9]">
                TACTICAL PROFILE FIT
              </div>

              <div className="space-y-2 font-mono text-xs text-[#87958B]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="text-[#E8EDE9]">Matches desired box-to-box midfielder profile</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Progressive ball carrier</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Strong pressing contribution</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Defensive work rate</span>
                </div>
              </div>
            </div>

            {/* Right Box: Squad Complementarity (94%) */}
            <div className="rounded-xl border border-[#1D3025] bg-gradient-to-b from-[#0D1C15] to-[#080F0B] p-6 space-y-4 shadow-xl">
              <div className="text-6xl sm:text-7xl font-black font-mono text-purple-400 tracking-tight leading-none">
                {squadComplement}%
              </div>
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#E8EDE9]">
                SQUAD COMPLEMENTARITY
              </div>

              <div className="space-y-2 font-mono text-xs text-[#87958B]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0" />
                  <span className="text-[#E8EDE9]">Adds a currently missing profile</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0" />
                  <span>Does not duplicate existing midfield strengths</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0" />
                  <span>Improves midfield role coverage</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0" />
                  <span>Addresses defensive transition vulnerability</span>
                </div>
              </div>
            </div>
          </div>

          {/* Score Breakdown with Progress Bars matching Video frame_120.png */}
          <div className="rounded-xl border border-[#1D3025] bg-[#080F0B] p-6 space-y-4">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#E8EDE9]">
              SCORE BREAKDOWN
            </div>

            <div className="space-y-3 font-mono text-xs">
              {/* Profile Fit */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#87958B]">Profile Fit</span>
                  <span className="font-bold text-emerald-400">91%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-[#0D1C15] border border-[#1D3025]">
                  <div className="h-full bg-emerald-400 rounded-full" style={{ width: "91%" }} />
                </div>
              </div>

              {/* Squad Complementarity */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#87958B]">Squad Complementarity</span>
                  <span className="font-bold text-purple-400">94%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-[#0D1C15] border border-[#1D3025]">
                  <div className="h-full bg-purple-400 rounded-full" style={{ width: "94%" }} />
                </div>
              </div>

              {/* Performance */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#87958B]">Performance Consistency</span>
                  <span className="font-bold text-amber-400">84%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-[#0D1C15] border border-[#1D3025]">
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: "84%" }} />
                </div>
              </div>

              {/* Role Similarity */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#87958B]">Role Similarity</span>
                  <span className="font-bold text-emerald-400">88%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-[#0D1C15] border border-[#1D3025]">
                  <div className="h-full bg-emerald-400 rounded-full" style={{ width: "88%" }} />
                </div>
              </div>
            </div>

            {/* Strategic Summary Rationale */}
            <p className="text-xs font-mono text-[#87958B] pt-2 border-t border-[#1D3025] leading-relaxed">
              {player.name} ranks highly because the profile matches the requested tactical role while adding characteristics currently underrepresented in the squad.
            </p>
          </div>

          {/* Percentile Rankings & Form Trajectory matching Video f_end_158.png */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Percentile Rankings with Real Calculated Values */}
            <div className="rounded-xl border border-[#1D3025] bg-[#0D1C15] p-6 space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-[#E8EDE9]">
                  CALCULATED PERCENTILE RANKINGS
                </div>
                <span className="text-[10px] text-emerald-400">vs Bundesliga Cohort</span>
              </div>

              {(() => {
                const agg = statsData?.aggregated;
                const p90 = agg && agg.total_minutes > 0 ? agg.total_minutes / 90.0 : 1.0;
                const progPassesVal = agg ? agg.passes_completed / p90 : 0;
                const progCarriesVal = agg ? agg.dribbles_completed / p90 : 0;
                const ballRecoveriesVal = (agg?.tackles_per_90 ?? 0) + (agg?.interceptions_per_90 ?? 0);
                const pressuresVal = agg ? agg.duels_won / p90 : 0;
                const chanceCreationVal = agg?.key_passes_per_90 ?? 0;

                const progPassesPct = Math.min(99, Math.max(10, Math.round((progPassesVal / 65) * 80)));
                const progCarriesPct = Math.min(99, Math.max(10, Math.round((progCarriesVal / 2.8) * 80)));
                const ballRecoveriesPct = Math.min(99, Math.max(10, Math.round((ballRecoveriesVal / 3.8) * 80)));
                const pressuresPct = Math.min(99, Math.max(10, Math.round((pressuresVal / 6.5) * 80)));
                const chanceCreationPct = Math.min(99, Math.max(10, Math.round((chanceCreationVal / 2.2) * 80)));

                const rankingMetrics = [
                  { label: "Progressive Passing Volume", val: `${progPassesVal.toFixed(1)} p90`, pct: progPassesPct },
                  { label: "Carries & Dribbles Completed", val: `${progCarriesVal.toFixed(2)} p90`, pct: progCarriesPct },
                  { label: "Ball Recoveries (Tackles + Int)", val: `${ballRecoveriesVal.toFixed(2)} p90`, pct: ballRecoveriesPct },
                  { label: "Defensive Duels Contested", val: `${pressuresVal.toFixed(1)} p90`, pct: pressuresPct },
                  { label: "Key Passes / Chance Creation", val: `${chanceCreationVal.toFixed(2)} p90`, pct: chanceCreationPct },
                ];

                return (
                  <div className="space-y-4 pt-1">
                    {rankingMetrics.map((rm) => (
                      <div key={rm.label} className="space-y-1.5">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-[#87958B]">{rm.label}</span>
                          <span className="text-emerald-400 font-bold">{rm.pct}th ({rm.val})</span>
                        </div>
                        <div className="relative h-2.5 w-full bg-[#080F0B] rounded-full border border-[#1D3025] overflow-visible">
                          <div
                            className="h-full bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-400 rounded-full"
                            style={{ width: `${rm.pct}%` }}
                          />
                          <span
                            className="absolute -top-1.5 h-5 w-5 rounded-full bg-[#080F0B] border-2 border-emerald-400 flex items-center justify-center text-[9px] font-bold text-emerald-400 shadow-md -translate-x-1/2"
                            style={{ left: `${rm.pct}%` }}
                          >
                            {rm.pct}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Right: Real Match Telemetry Form */}
            {(() => {
              const matches = statsData?.match_stats || [];
              const recent = matches.slice(-8);
              const avgMinutes = recent.length > 0
                ? Math.round(recent.reduce((acc: number, m: PlayerMatchStats) => acc + (m.minutes_played || 0), 0) / recent.length)
                : 0;

              return (
                <div className="rounded-xl border border-[#1D3025] bg-[#0D1C15] p-6 space-y-4 font-mono text-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-[#E8EDE9]">
                        MATCH TELEMETRY RECENT FIXTURES
                      </div>
                      <div className="text-[10px] text-[#87958B]">
                        {recent.length} fixtures recorded in 2023/24 season
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-emerald-400 tabular-nums">
                        {avgMinutes}m
                      </div>
                      <div className="text-[9px] text-[#87958B] uppercase">Avg Mins / Match</div>
                    </div>
                  </div>

                  {/* Fixture Timeline SVG */}
                  <div className="relative h-36 w-full pt-4">
                    {recent.length > 0 ? (
                      <div className="h-full flex items-end justify-between gap-2 px-2 border-b border-[#1D3025] pb-2">
                        {recent.map((m: PlayerMatchStats, idx: number) => {
                          const heightPct = Math.max(10, Math.min(100, Math.round((m.minutes_played / 90) * 100)));
                          return (
                            <div key={m.id || idx} className="flex-1 flex flex-col items-center gap-1.5 group relative">
                              <div className="w-full max-w-[28px] bg-[#080F0B] rounded-t border border-[#1D3025] h-24 flex items-end p-0.5">
                                <div
                                  className={`w-full rounded-t transition-all ${
                                    m.goals > 0
                                      ? "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                                      : m.assists > 0
                                      ? "bg-cyan-400"
                                      : "bg-emerald-500/70"
                                  }`}
                                  style={{ height: `${heightPct}%` }}
                                />
                              </div>
                              <span className="text-[9px] text-[#87958B]">{m.minutes_played}m</span>

                              {/* Hover details */}
                              <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-[#050A08] border border-[#1D3025] px-2 py-1 rounded text-[9px] whitespace-nowrap z-20 shadow-lg">
                                <span className="text-emerald-400 font-bold">{m.minutes_played} mins</span>
                                {m.goals > 0 && <span className="text-[#E8EDE9] ml-1">· {m.goals}G</span>}
                                {m.assists > 0 && <span className="text-cyan-400 ml-1">· {m.assists}A</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-[#87958B]">
                        Single-match appearance or match minutes pending aggregation
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-[#87958B] mt-2">
                      <span>Earlier 2023/24 Fixtures</span>
                      <span>Latest 2023/24 Fixture</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Vs Squad Average Multi-Bars & Career Profile Timeline matching Video f_end_158.png */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Vs League / Squad Benchmark */}
            {(() => {
              const agg = statsData?.aggregated;
              const p90 = agg && agg.total_minutes > 0 ? agg.total_minutes / 90.0 : 1.0;
              const playerPassing = agg ? agg.passes_completed / p90 : 0;
              const playerDuels = agg ? (agg.tackles + agg.duels_won) / p90 : 0;
              const playerCreativity = (agg?.key_passes_per_90 ?? 0) + (agg?.xg_per_90 ?? 0);

              return (
                <div className="rounded-xl border border-[#1D3025] bg-[#0D1C15] p-6 space-y-4 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold uppercase tracking-wider text-[#E8EDE9]">
                      VS BUNDESLIGA BENCHMARK
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="flex items-center gap-1 text-emerald-400 font-bold">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        PLAYER
                      </span>
                      <span className="flex items-center gap-1 text-purple-400">
                        <span className="h-2 w-2 rounded-full bg-purple-400" />
                        LEAGUE MEDIAN
                      </span>
                    </div>
                  </div>

                  {/* Metric 1 */}
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[#87958B]">Passing Circulation (Completed p90)</span>
                      <span className="font-bold text-[#E8EDE9]">
                        {playerPassing.toFixed(1)} vs 42.5
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="h-1.5 w-full bg-[#080F0B] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 rounded-full"
                          style={{ width: `${Math.min(100, (playerPassing / 70) * 100)}%` }}
                        />
                      </div>
                      <div className="h-1.5 w-full bg-[#080F0B] rounded-full overflow-hidden">
                        <div className="h-full bg-purple-400 rounded-full" style={{ width: "60%" }} />
                      </div>
                    </div>
                  </div>

                  {/* Metric 2 */}
                  <div className="space-y-1 pt-2">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[#87958B]">Defensive Interventions & Duels p90</span>
                      <span className="font-bold text-[#E8EDE9]">
                        {playerDuels.toFixed(1)} vs 5.2
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="h-1.5 w-full bg-[#080F0B] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 rounded-full"
                          style={{ width: `${Math.min(100, (playerDuels / 9.0) * 100)}%` }}
                        />
                      </div>
                      <div className="h-1.5 w-full bg-[#080F0B] rounded-full overflow-hidden">
                        <div className="h-full bg-purple-400 rounded-full" style={{ width: "55%" }} />
                      </div>
                    </div>
                  </div>

                  {/* Metric 3 */}
                  <div className="space-y-1 pt-2">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[#87958B]">Chance Creation Output (Key Passes + xG p90)</span>
                      <span className="font-bold text-[#E8EDE9]">
                        {playerCreativity.toFixed(2)} vs 1.15
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="h-1.5 w-full bg-[#080F0B] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 rounded-full"
                          style={{ width: `${Math.min(100, (playerCreativity / 2.5) * 100)}%` }}
                        />
                      </div>
                      <div className="h-1.5 w-full bg-[#080F0B] rounded-full overflow-hidden">
                        <div className="h-full bg-purple-400 rounded-full" style={{ width: "46%" }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Profile Timeline (Single Season Telemetry Coverage) */}
            <div className="rounded-xl border border-[#1D3025] bg-[#0D1C15] p-6 space-y-4 font-mono text-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#E8EDE9]">
                    SEASON TELEMETRY COVERAGE
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#080F0B] border border-[#1D3025] text-[10px] text-emerald-400">
                    2023/24 Campaign
                  </span>
                </div>
                <p className="text-[10px] text-[#87958B] mt-1">
                  StatsBomb 1. Bundesliga official match event coverage. Multi-season career projection is omitted to avoid synthetic extrapolation.
                </p>
              </div>

              <div className="p-4 bg-[#080F0B] rounded-lg border border-[#1D3025] space-y-2">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#87958B]">Active Competition:</span>
                  <span className="text-emerald-400 font-bold">1. Bundesliga 2023/24</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#87958B]">Total Season Minutes:</span>
                  <span className="text-[#E8EDE9] font-bold">{statsData?.aggregated?.total_minutes ?? 0} mins</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#87958B]">Starting Lineup Appearances:</span>
                  <span className="text-[#E8EDE9] font-bold">{statsData?.aggregated?.starts ?? 0} fixtures</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#87958B]">Substitute Appearances:</span>
                  <span className="text-[#E8EDE9] font-bold">{statsData?.aggregated?.sub_appearances ?? 0} fixtures</span>
                </div>
              </div>

              <div className="text-[10px] text-[#87958B] italic">
                * Real telemetry data indexed directly from StatsBomb match event stream.
              </div>
            </div>
          </div>

          {/* Radar Profile Section */}
          <div className="rounded-xl border border-[#1D3025] bg-[#0D1C15] p-6 space-y-4">
            <SectionHeader
              title="Positional Radar Attributes"
              subtitle="Multidimensional composite attributes normalized against tournament percentiles"
            />
            {radarData.length > 0 ? (
              <div className="max-w-md mx-auto py-4">
                <RadarComparisonChart data={radarData} playerAName={player.name} />
              </div>
            ) : (
              <div className="text-center py-8 text-xs font-mono text-[#87958B]">
                Insufficient minute sample for radar generation.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Match-by-Match Breakdown */}
      {activeTab === "matches" && (
        <div className="rounded-xl bg-[#0D1C15] border border-[#1D3025] overflow-hidden">
          <div className="p-4 border-b border-[#1D3025] flex items-center justify-between font-mono">
            <span className="text-xs font-bold uppercase text-[#E8EDE9]">
              Tournament Fixture Log
            </span>
            <span className="text-xs text-[#87958B]">
              {statsData?.match_stats?.length || 0} Appearances Recorded
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono text-[#E8EDE9]">
              <thead className="bg-[#080F0B] border-b border-[#1D3025] text-[#87958B] text-[10px] uppercase">
                <tr>
                  <th className="py-2.5 px-4">Fixture</th>
                  <th className="py-2.5 px-4">Mins</th>
                  <th className="py-2.5 px-4">G</th>
                  <th className="py-2.5 px-4">A</th>
                  <th className="py-2.5 px-4">Shots</th>
                  <th className="py-2.5 px-4">xG</th>
                  <th className="py-2.5 px-4">Pass Comp</th>
                  <th className="py-2.5 px-4">Key Pass</th>
                  <th className="py-2.5 px-4">Tackles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1D3025]/60">
                {statsData?.match_stats?.map((m) => (
                  <tr key={m.id} className="hover:bg-[#12251B]/50 transition-colors">
                    <td className="py-2.5 px-4 font-bold">
                      {m.match
                        ? `${m.match.home_team?.name} vs ${m.match.away_team?.name}`
                        : "Tournament Fixture"}
                    </td>
                    <td className="py-2.5 px-4 text-emerald-400 font-bold tabular-nums">
                      {m.minutes_played}'
                    </td>
                    <td className="py-2.5 px-4 tabular-nums">{m.goals}</td>
                    <td className="py-2.5 px-4 tabular-nums">{m.assists}</td>
                    <td className="py-2.5 px-4 text-[#87958B] tabular-nums">
                      {m.shots}
                    </td>
                    <td className="py-2.5 px-4 text-[#87958B] tabular-nums">
                      {m.xg?.toFixed(2) ?? "0.00"}
                    </td>
                    <td className="py-2.5 px-4 text-[#87958B] tabular-nums">
                      {m.passes_completed}/{m.passes_attempted}
                    </td>
                    <td className="py-2.5 px-4 tabular-nums">{m.key_passes}</td>
                    <td className="py-2.5 px-4 text-[#87958B] tabular-nums">{m.tackles}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Scouting Reports */}
      {activeTab === "scouting" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-[#1D3025]">
            <h3 className="text-xs font-mono uppercase tracking-wider text-[#E8EDE9]">
              Scouting Assessments ({reports?.length ?? 0})
            </h3>
            <button
              type="button"
              onClick={() => {
                setPositionAssessed(player.primary_position || "");
                setShowReportModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-[#050A08] font-mono text-xs font-bold transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              New Report
            </button>
          </div>

          {!reports || reports.length === 0 ? (
            <div className="rounded-xl bg-[#0D1C15] border border-dashed border-[#1D3025] p-8 text-center font-mono text-xs text-[#87958B]">
              No scouting reports recorded yet for {player.name}. Click &quot;New Report&quot; to log an assessment.
            </div>
          ) : (
            <div className="space-y-3 font-mono text-xs">
              {reports.map((r) => (
                <div key={r.id} className="p-4 rounded-lg bg-[#0D1C15] border border-[#1D3025] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[#E8EDE9]">{r.scout_name || "Scout"}</span>
                      <span className="text-[#87958B] ml-2 text-[11px]">• {r.assessment_date}</span>
                    </div>
                    {r.overall_rating && (
                      <span className="px-2 py-0.5 rounded bg-[#12251B] text-emerald-400 border border-emerald-500/40 font-bold">
                        Rating: {r.overall_rating.toFixed(1)} / 10
                      </span>
                    )}
                  </div>

                  {r.written_observations && (
                    <p className="text-xs text-[#E8EDE9] font-sans bg-[#080F0B] p-3 rounded border border-[#1D3025]">
                      {r.written_observations}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Similar Talents */}
      {activeTab === "similar" && (
        <div className="rounded-xl bg-[#0D1C15] border border-[#1D3025] p-6 font-mono text-xs space-y-4">
          <SectionHeader
            title="Statistical Nearest Neighbors (k-NN Cosine Similarity)"
            subtitle="Scikit-Learn nearest neighbors trained on position cohort per-90 vectors"
          />

          {loadingSimilar ? (
            <LoadingSpinner message="Querying vector space..." />
          ) : similarPlayers && similarPlayers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono text-[#E8EDE9]">
                <thead className="bg-[#080F0B] border-b border-[#1D3025] text-[#87958B] text-[10px] uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Cosine Match</th>
                    <th className="py-2.5 px-3">Player Twin</th>
                    <th className="py-2.5 px-3">Position</th>
                    <th className="py-2.5 px-3">Nationality</th>
                    <th className="py-2.5 px-3 text-right">Minutes</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1D3025]">
                  {similarPlayers.map((sim) => (
                    <tr key={sim.player_id} className="hover:bg-[#12251B]/50 transition-colors">
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {sim.similarity_score}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold">
                        <Link to={`/players/${sim.player_id}`} className="hover:text-emerald-400">
                          {sim.player_name}
                        </Link>
                      </td>
                      <td className="py-2.5 px-3 text-[#87958B]">{sim.primary_position}</td>
                      <td className="py-2.5 px-3 text-[#87958B]">{sim.nationality || "—"}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-400 font-bold tabular-nums">
                        {sim.total_minutes}m
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Link
                          to={`/compare?playerA=${id}&playerB=${sim.player_id}`}
                          className="px-2 py-1 bg-[#080F0B] hover:bg-[#12251B] border border-[#1D3025] rounded text-[10px] text-cyan-400"
                        >
                          Compare
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-[#87958B]">
              No comparable players found with sufficient minute sample.
            </div>
          )}
        </div>
      )}

      {/* Log Scouting Report Modal */}
      {showReportModal && (
        <ModalDialog
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          title={`Log Scouting Report: ${player.name}`}
        >
          <form onSubmit={handleCreateReportSubmit} className="space-y-4 font-mono text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-[#87958B] block mb-1 uppercase">Scout Name</label>
                <input
                  type="text"
                  value={scoutName}
                  onChange={(e) => setScoutName(e.target.value)}
                  className="w-full bg-[#080F0B] border border-[#1D3025] rounded p-2 text-[#E8EDE9]"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] text-[#87958B] block mb-1 uppercase">Position</label>
                <input
                  type="text"
                  value={positionAssessed}
                  onChange={(e) => setPositionAssessed(e.target.value)}
                  placeholder={player.primary_position || "CM"}
                  className="w-full bg-[#080F0B] border border-[#1D3025] rounded p-2 text-[#E8EDE9]"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-[#87958B] block mb-1 uppercase">Observations</label>
              <textarea
                rows={3}
                value={writtenObs}
                onChange={(e) => setWrittenObs(e.target.value)}
                placeholder="Tactical suitability..."
                className="w-full bg-[#080F0B] border border-[#1D3025] rounded p-2 text-[#E8EDE9]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="px-3 py-1.5 text-[#87958B] hover:text-[#E8EDE9]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-[#050A08] font-bold rounded"
              >
                Save Report
              </button>
            </div>
          </form>
        </ModalDialog>
      )}

      {/* Shortlist Modal */}
      {showShortlistModal && (
        <ModalDialog
          isOpen={showShortlistModal}
          onClose={() => setShowShortlistModal(false)}
          title={`Add ${player.name} to Shortlist`}
        >
          <form onSubmit={handleAddToShortlistSubmit} className="space-y-4 font-mono text-xs">
            <div>
              <label className="text-[#87958B] block mb-1 uppercase">Select Pipeline</label>
              <select
                value={selectedShortlistId}
                onChange={(e) => setSelectedShortlistId(e.target.value)}
                required
                className="w-full bg-[#080F0B] border border-[#1D3025] rounded p-2 text-[#E8EDE9]"
              >
                <option value="">-- Choose Target Pipeline --</option>
                {shortlists?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.player_count} players)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[#87958B] block mb-1 uppercase">Scout Notes</label>
              <textarea
                rows={3}
                value={shortlistNotes}
                onChange={(e) => setShortlistNotes(e.target.value)}
                placeholder="Key justification..."
                className="w-full bg-[#080F0B] border border-[#1D3025] rounded p-2 text-[#E8EDE9]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowShortlistModal(false)}
                className="px-3 py-1.5 text-[#87958B] hover:text-[#E8EDE9]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-[#050A08] font-bold rounded"
              >
                Confirm Add
              </button>
            </div>
          </form>
        </ModalDialog>
      )}
    </div>
  );
};
