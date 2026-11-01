import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Plus,
  BookmarkPlus,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { api } from "../services/api";
import type { ScoutingReportCreate, ShortlistPlayerCreate } from "../types/scouting";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { formatP90, formatPct, getPositionBadgeClass } from "../lib/utils";

export const PlayerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"overview" | "stats" | "scouting">("overview");
  const [showScoutModal, setShowScoutModal] = useState(false);
  const [showShortlistModal, setShowShortlistModal] = useState(false);

  // Form states for scouting report
  const [scoutName, setScoutName] = useState("");
  const [positionAssessed, setPositionAssessed] = useState("");
  const [overallRating, setOverallRating] = useState(8.0);
  const [technicalRating, setTechnicalRating] = useState(8.0);
  const [tacticalRating, setTacticalRating] = useState(7.5);
  const [physicalRating, setPhysicalRating] = useState(7.5);
  const [mentalRating, setMentalRating] = useState(8.0);
  const [writtenObs, setWrittenObs] = useState("");

  // Shortlist form
  const [selectedShortlistId, setSelectedShortlistId] = useState("");
  const [shortlistNotes, setShortlistNotes] = useState("");

  const { data: player, isLoading: loadingPlayer, error: playerError } = useQuery({
    queryKey: ["player", id],
    queryFn: () => api.getPlayer(id!),
    enabled: !!id,
  });

  const { data: statsData } = useQuery({
    queryKey: ["playerStats", id],
    queryFn: () => api.getPlayerStats(id!),
    enabled: !!id,
  });

  const { data: reports, refetch: refetchReports } = useQuery({
    queryKey: ["playerReports", id],
    queryFn: () => api.getPlayerScoutingReports(id!),
    enabled: !!id,
  });

  const { data: shortlists } = useQuery({
    queryKey: ["shortlists"],
    queryFn: api.getShortlists,
  });

  // Create report mutation
  const createReportMutation = useMutation({
    mutationFn: (data: ScoutingReportCreate) => api.createPlayerScoutingReport(id!, data),
    onSuccess: () => {
      refetchReports();
      setShowScoutModal(false);
      setWrittenObs("");
    },
  });

  // Add to shortlist mutation
  const addToShortlistMutation = useMutation({
    mutationFn: ({ shortlistId, data }: { shortlistId: string; data: ShortlistPlayerCreate }) =>
      api.addPlayerToShortlist(shortlistId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shortlists"] });
      setShowShortlistModal(false);
      setShortlistNotes("");
    },
  });

  if (loadingPlayer) {
    return <LoadingSpinner message="Retrieving player intelligence dossier..." />;
  }

  if (playerError || !player) {
    return <ErrorMessage message={playerError ? (playerError as Error).message : "Player not found"} />;
  }

  const agg = player.aggregated_stats;

  // Chart data for key metrics per 90
  const per90ChartData = agg
    ? [
        { metric: "Goals/90", value: agg.goals_per_90 },
        { metric: "Assists/90", value: agg.assists_per_90 },
        { metric: "xG/90", value: agg.xg_per_90 },
        { metric: "xA/90", value: agg.xa_per_90 },
        { metric: "KeyPass/90", value: agg.key_passes_per_90 },
        { metric: "Tackles/90", value: agg.tackles_per_90 },
        { metric: "Interc/90", value: agg.interceptions_per_90 },
      ]
    : [];

  const handleCreateReport = (e: React.FormEvent) => {
    e.preventDefault();
    createReportMutation.mutate({
      scout_name: scoutName || "Lead Analyst",
      position_assessed: positionAssessed || player.primary_position,
      overall_rating: overallRating,
      technical_rating: technicalRating,
      tactical_rating: tacticalRating,
      physical_rating: physicalRating,
      mental_rating: mentalRating,
      written_observations: writtenObs,
    });
  };

  const handleAddToShortlist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShortlistId) return;
    addToShortlistMutation.mutate({
      shortlistId: selectedShortlistId,
      data: {
        player_id: player.id,
        notes: shortlistNotes,
        recruitment_status: "Target",
      },
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
        <Link to="/players" className="hover:text-emerald-400 flex items-center gap-1 transition">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Player Discovery</span>
        </Link>
      </div>

      {/* Player Header Banner */}
      <div className="rounded-xl border border-zinc-800 bg-[#0b101d] p-6 relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center font-mono text-2xl text-emerald-400 font-bold">
              {player.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold font-mono text-white">{player.name}</h1>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border ${getPositionBadgeClass(
                    player.primary_position
                  )}`}
                >
                  {player.primary_position || "Player"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-zinc-400 mt-1.5">
                <span>Nationality: <strong className="text-zinc-200">{player.nationality || "—"}</strong></span>
                <span>Teams: <strong className="text-zinc-200">{player.teams.map((t) => t.name).join(", ") || "—"}</strong></span>
                <span>Matches: <strong className="text-emerald-400">{player.appearances_count}</strong></span>
                <span>Minutes: <strong className="text-emerald-400">{player.total_minutes}'</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowShortlistModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono border border-zinc-700 transition cursor-pointer"
            >
              <BookmarkPlus className="w-3.5 h-3.5 text-emerald-400" />
              Add to Shortlist
            </button>
            <button
              onClick={() => setShowScoutModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono transition cursor-pointer shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              Log Scouting Report
            </button>
          </div>
        </div>

        {/* Tab Headers */}
        <div className="flex gap-4 border-b border-zinc-800/80 mt-6 -mb-6 text-xs font-mono">
          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-3 font-medium transition cursor-pointer ${
              activeTab === "overview"
                ? "text-emerald-400 border-b-2 border-emerald-500"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Overview & Telemetry
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={`pb-3 font-medium transition cursor-pointer ${
              activeTab === "stats"
                ? "text-emerald-400 border-b-2 border-emerald-500"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Match Breakdown ({statsData?.match_stats?.length ?? 0})
          </button>
          <button
            onClick={() => setActiveTab("scouting")}
            className={`pb-3 font-medium transition cursor-pointer ${
              activeTab === "scouting"
                ? "text-emerald-400 border-b-2 border-emerald-500"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Scouting Reports ({reports?.length ?? 0})
          </button>
        </div>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Aggregated KPI Cards */}
          {agg && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              <div className="p-3.5 rounded border border-zinc-800 bg-[#0c1220]">
                <div className="text-[10px] font-mono text-zinc-500 uppercase">Goals / Assists</div>
                <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                  {agg.goals} <span className="text-zinc-500 text-sm font-normal">/</span> {agg.assists}
                </div>
              </div>

              <div className="p-3.5 rounded border border-zinc-800 bg-[#0c1220]">
                <div className="text-[10px] font-mono text-zinc-500 uppercase">Expected Goals (xG)</div>
                <div className="text-xl font-bold font-mono text-zinc-100 mt-1">{agg.total_xg.toFixed(2)}</div>
                <div className="text-[10px] text-zinc-500 font-mono">{formatP90(agg.xg_per_90)} / 90</div>
              </div>

              <div className="p-3.5 rounded border border-zinc-800 bg-[#0c1220]">
                <div className="text-[10px] font-mono text-zinc-500 uppercase">Pass Completion</div>
                <div className="text-xl font-bold font-mono text-zinc-100 mt-1">{formatPct(agg.pass_completion_pct)}</div>
                <div className="text-[10px] text-zinc-500 font-mono">{agg.passes_completed}/{agg.passes_attempted} att</div>
              </div>

              <div className="p-3.5 rounded border border-zinc-800 bg-[#0c1220]">
                <div className="text-[10px] font-mono text-zinc-500 uppercase">Key Passes</div>
                <div className="text-xl font-bold font-mono text-zinc-100 mt-1">{agg.key_passes}</div>
                <div className="text-[10px] text-zinc-500 font-mono">{formatP90(agg.key_passes_per_90)} / 90</div>
              </div>

              <div className="p-3.5 rounded border border-zinc-800 bg-[#0c1220]">
                <div className="text-[10px] font-mono text-zinc-500 uppercase">Tackles Won</div>
                <div className="text-xl font-bold font-mono text-zinc-100 mt-1">{agg.tackles}</div>
                <div className="text-[10px] text-zinc-500 font-mono">{formatP90(agg.tackles_per_90)} / 90</div>
              </div>

              <div className="p-3.5 rounded border border-zinc-800 bg-[#0c1220]">
                <div className="text-[10px] font-mono text-zinc-500 uppercase">Interceptions</div>
                <div className="text-xl font-bold font-mono text-zinc-100 mt-1">{agg.interceptions}</div>
                <div className="text-[10px] text-zinc-500 font-mono">{formatP90(agg.interceptions_per_90)} / 90</div>
              </div>
            </div>
          )}

          {/* Chart Section: Per 90 Performance Profile */}
          <div className="rounded-lg border border-zinc-800 bg-[#0b101d] p-5">
            <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-4">
              Normalized Per 90 Production Profile
            </h3>
            {per90ChartData.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={per90ChartData} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="metric" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 11, fontFamily: "monospace" }} />
                    <YAxis stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 11, fontFamily: "monospace" }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", color: "#f8fafc", fontFamily: "monospace", fontSize: "12px" }}
                    />
                    <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-xs font-mono text-zinc-500 text-center py-12">
                Insufficient tournament minute volume for normalized per-90 metrics.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Match Breakdown */}
      {activeTab === "stats" && (
        <div className="rounded-lg border border-zinc-800 bg-[#0b101d] overflow-hidden">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#090d18] border-b border-zinc-800 text-zinc-400 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Fixture</th>
                <th className="py-3 px-4">Mins</th>
                <th className="py-3 px-4">G</th>
                <th className="py-3 px-4">A</th>
                <th className="py-3 px-4">Shots</th>
                <th className="py-3 px-4">xG</th>
                <th className="py-3 px-4">Pass Comp</th>
                <th className="py-3 px-4">Key Pass</th>
                <th className="py-3 px-4">Tackles</th>
                <th className="py-3 px-4">Interc</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {statsData?.match_stats?.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-900/50">
                  <td className="py-3 px-4 font-medium text-zinc-200">
                    {s.match ? `${s.match.home_team?.name} vs ${s.match.away_team?.name}` : "Euro 2024 Match"}
                  </td>
                  <td className="py-3 px-4 text-emerald-400 font-bold">{s.minutes_played}'</td>
                  <td className="py-3 px-4 text-zinc-200">{s.goals}</td>
                  <td className="py-3 px-4 text-zinc-200">{s.assists}</td>
                  <td className="py-3 px-4 text-zinc-400">{s.shots} ({s.shots_on_target})</td>
                  <td className="py-3 px-4 text-zinc-400">{s.xg?.toFixed(2) ?? "0.00"}</td>
                  <td className="py-3 px-4 text-zinc-400">{s.passes_completed}/{s.passes_attempted}</td>
                  <td className="py-3 px-4 text-zinc-200">{s.key_passes}</td>
                  <td className="py-3 px-4 text-zinc-400">{s.tackles}</td>
                  <td className="py-3 px-4 text-zinc-400">{s.interceptions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Scouting Reports */}
      {activeTab === "scouting" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400">
              Scouting Observations & Assessments
            </h3>
            <button
              onClick={() => setShowScoutModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              New Report
            </button>
          </div>

          {!reports || reports.length === 0 ? (
            <div className="text-center py-12 rounded border border-dashed border-zinc-800 bg-[#090d18] text-zinc-500 text-xs font-mono">
              No scouting reports recorded yet for this player.
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((r) => (
                <div key={r.id} className="p-4 rounded border border-zinc-800 bg-[#0c1220] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-zinc-200 font-mono">{r.scout_name || "Scout"}</span>
                      <span className="text-[11px] text-zinc-500 font-mono">• {r.assessment_date}</span>
                    </div>
                    {r.overall_rating && (
                      <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-600 text-emerald-400 font-mono text-xs font-bold">
                        Rating: {r.overall_rating.toFixed(1)}/10
                      </span>
                    )}
                  </div>
                  {r.written_observations && (
                    <p className="text-xs text-zinc-300 leading-relaxed font-sans">{r.written_observations}</p>
                  )}
                  <div className="flex gap-4 pt-2 border-t border-zinc-800 text-[10px] font-mono text-zinc-500">
                    <span>Tech: <strong className="text-zinc-300">{r.technical_rating ?? "—"}</strong></span>
                    <span>Tact: <strong className="text-zinc-300">{r.tactical_rating ?? "—"}</strong></span>
                    <span>Phys: <strong className="text-zinc-300">{r.physical_rating ?? "—"}</strong></span>
                    <span>Ment: <strong className="text-zinc-300">{r.mental_rating ?? "—"}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: New Scouting Report */}
      {showScoutModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f172a] border border-zinc-800 rounded-lg max-w-md w-full p-6 space-y-4 font-mono text-xs">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Record Scouting Assessment
            </h3>
            <form onSubmit={handleCreateReport} className="space-y-3">
              <div>
                <label className="text-zinc-400 block mb-1 text-[11px]">Scout Name</label>
                <input
                  type="text"
                  value={scoutName}
                  onChange={(e) => setScoutName(e.target.value)}
                  placeholder="e.g. Chief European Scout"
                  className="w-full bg-[#070a12] border border-zinc-800 rounded p-2 text-zinc-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 block mb-1 text-[11px]">Overall Rating (1-10)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="10"
                    value={overallRating}
                    onChange={(e) => setOverallRating(parseFloat(e.target.value))}
                    className="w-full bg-[#070a12] border border-zinc-800 rounded p-2 text-zinc-200"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1 text-[11px]">Position Assessed</label>
                  <input
                    type="text"
                    value={positionAssessed}
                    onChange={(e) => setPositionAssessed(e.target.value)}
                    placeholder={player.primary_position || "Winger"}
                    className="w-full bg-[#070a12] border border-zinc-800 rounded p-2 text-zinc-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="text-zinc-400 block mb-1 text-[10px]">Technical</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="10"
                    value={technicalRating}
                    onChange={(e) => setTechnicalRating(parseFloat(e.target.value))}
                    className="w-full bg-[#070a12] border border-zinc-800 rounded p-1.5 text-zinc-200 text-xs"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1 text-[10px]">Tactical</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="10"
                    value={tacticalRating}
                    onChange={(e) => setTacticalRating(parseFloat(e.target.value))}
                    className="w-full bg-[#070a12] border border-zinc-800 rounded p-1.5 text-zinc-200 text-xs"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1 text-[10px]">Physical</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="10"
                    value={physicalRating}
                    onChange={(e) => setPhysicalRating(parseFloat(e.target.value))}
                    className="w-full bg-[#070a12] border border-zinc-800 rounded p-1.5 text-zinc-200 text-xs"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1 text-[10px]">Mental</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="10"
                    value={mentalRating}
                    onChange={(e) => setMentalRating(parseFloat(e.target.value))}
                    className="w-full bg-[#070a12] border border-zinc-800 rounded p-1.5 text-zinc-200 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1 text-[11px]">Written Observations</label>
                <textarea
                  rows={4}
                  value={writtenObs}
                  onChange={(e) => setWrittenObs(e.target.value)}
                  placeholder="Tactical fit, athleticism, technical strengths, match awareness..."
                  className="w-full bg-[#070a12] border border-zinc-800 rounded p-2 text-zinc-200"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowScoutModal(false)}
                  className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createReportMutation.isPending}
                  className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  {createReportMutation.isPending ? "Saving..." : "Save Assessment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add to Shortlist */}
      {showShortlistModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f172a] border border-zinc-800 rounded-lg max-w-md w-full p-6 space-y-4 font-mono text-xs">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Add Player to Shortlist
            </h3>
            <form onSubmit={handleAddToShortlist} className="space-y-3">
              <div>
                <label className="text-zinc-400 block mb-1 text-[11px]">Select Target Shortlist</label>
                <select
                  value={selectedShortlistId}
                  onChange={(e) => setSelectedShortlistId(e.target.value)}
                  className="w-full bg-[#070a12] border border-zinc-800 rounded p-2 text-zinc-200"
                  required
                >
                  <option value="">-- Choose Shortlist --</option>
                  {shortlists?.map((sl) => (
                    <option key={sl.id} value={sl.id}>
                      {sl.name} ({sl.player_count} players)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1 text-[11px]">Recruitment Notes</label>
                <textarea
                  rows={3}
                  value={shortlistNotes}
                  onChange={(e) => setShortlistNotes(e.target.value)}
                  placeholder="Target role, transfer readiness, priority..."
                  className="w-full bg-[#070a12] border border-zinc-800 rounded p-2 text-zinc-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowShortlistModal(false)}
                  className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addToShortlistMutation.isPending || !selectedShortlistId}
                  className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold disabled:opacity-50"
                >
                  {addToShortlistMutation.isPending ? "Adding..." : "Add to Shortlist"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
