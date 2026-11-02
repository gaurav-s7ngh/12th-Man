import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import { PageHeader } from "../components/layout/PageHeader";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ErrorMessage } from "../components/common/ErrorMessage";
import {
  BrainCircuit,
  Target,
  ArrowRight,
  ShieldCheck,
  Search,
} from "lucide-react";
import type { RecruitmentMapCandidate } from "../types/football";

const ROLE_OPTIONS = [
  "Box-to-Box Engine",
  "Ball-Winning Destroyer",
  "Deep-Lying Playmaker",
  "Inverted Creator",
  "Ball-Playing Defender",
  "Clinical Poacher",
  "Attacking Wingback",
];

export const AnalyticsLabPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"market" | "archetypes" | "comparison">("market");
  const [selectedRole, setSelectedRole] = useState("Box-to-Box Engine");
  const [selectedNeedId, setSelectedNeedId] = useState<string>("");
  const [selectedPosition, setSelectedPosition] = useState<string>("");
  const [selectedFoot, setSelectedFoot] = useState<string>("");
  const [minMinutesFilter, setMinMinutesFilter] = useState<number>(90);
  const [searchQuery, setSearchQuery] = useState("");
  const [quadrantFilter, setQuadrantFilter] = useState<string>("all");
  const [selectedCandidate, setSelectedCandidate] = useState<RecruitmentMapCandidate | null>(null);
  const [hoveredCandidate, setHoveredCandidate] = useState<RecruitmentMapCandidate | null>(null);

  // 1. Fetch ML Archetypes
  const { data: archetypes, isLoading: loadingArchetypes } = useQuery({
    queryKey: ["mlArchetypes"],
    queryFn: api.getArchetypes,
  });

  // 1b. Fetch Active Club
  const { data: club } = useQuery({
    queryKey: ["club"],
    queryFn: () => api.getClub(),
  });

  // 2. Fetch Club Recruitment Needs
  const { data: recruitmentNeeds } = useQuery({
    queryKey: ["recruitmentNeeds", club?.id],
    queryFn: () => api.getRecruitmentNeeds(),
  });

  // 3. Fetch Genuine Recruitment 2D Map Data
  const {
    data: mapData,
    isLoading: loadingMap,
    error: mapError,
  } = useQuery({
    queryKey: [
      "recruitmentMap",
      club?.id,
      selectedRole,
      selectedNeedId,
      selectedPosition,
      selectedFoot,
      minMinutesFilter,
    ],
    queryFn: () =>
      api.getRecruitmentMap({
        role_profile: selectedRole,
        need_id: selectedNeedId || undefined,
        club_id: club?.id,
        position: selectedPosition || undefined,
        preferred_foot: selectedFoot || undefined,
        min_minutes: minMinutesFilter,
        limit: 80,
      }),
  });

  // Filter candidates by search and quadrant
  const filteredCandidates = useMemo(() => {
    const list = mapData?.candidates;
    if (!list) return [];
    return list.filter((c) => {
      const matchesSearch =
        searchQuery === "" ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.current_club.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.primary_position.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesQuadrant = quadrantFilter === "all" || c.quadrant === quadrantFilter;
      return matchesSearch && matchesQuadrant;
    });
  }, [mapData, searchQuery, quadrantFilter]);

  // Active candidate displayed on left panel (preserves selection on mouse leave, auto-adjusts on filter change)
  const activeFocusCandidate = useMemo(() => {
    if (selectedCandidate) {
      const match = filteredCandidates.find((c) => c.id === selectedCandidate.id);
      if (match) return match;
    }
    return filteredCandidates.length > 0 ? filteredCandidates[0] : null;
  }, [selectedCandidate, filteredCandidates]);

  const handleNeedChange = (needId: string) => {
    setSelectedNeedId(needId);
    if (needId && recruitmentNeeds) {
      const match = recruitmentNeeds.find((n) => n.id === needId);
      if (match) {
        setSelectedRole(match.role_profile);
      }
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics & Research Lab"
        subtitle="Genuine 2D recruitment matrix (Profile Fit vs Squad Complementarity) and unsupervised tactical archetype discovery"
        breadcrumbs={[
          { label: "Overview", href: "/" },
          { label: "Analytics Lab", href: "/analytics-lab" },
        ]}
      />

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-[#1D3025] pb-2 font-mono text-xs overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab("market")}
          className={`px-3 py-1.5 rounded transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === "market"
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold"
              : "text-[#87958B] hover:text-[#E8EDE9]"
          }`}
        >
          Recruitment Matrix (2D Map)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("archetypes")}
          className={`px-3 py-1.5 rounded transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === "archetypes"
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold"
              : "text-[#87958B] hover:text-[#E8EDE9]"
          }`}
        >
          ML Tactical Archetypes
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("comparison")}
          className={`px-3 py-1.5 rounded transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === "comparison"
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold"
              : "text-[#87958B] hover:text-[#E8EDE9]"
          }`}
        >
          Model Architecture
        </button>
      </div>

      {/* Tab 1: Genuine 2D Recruitment Map Matrix */}
      {activeTab === "market" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-[#1D3025] bg-gradient-to-b from-[#080F0B] to-[#050A08] p-6 sm:p-8 space-y-6 shadow-2xl">
            {/* Header & Context */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1D3025] pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#E8EDE9]">
                    RECRUITMENT MAP
                  </h2>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold uppercase">
                    Calculated Telemetry
                  </span>
                </div>
                <p className="text-xs font-mono text-[#87958B] max-w-3xl">
                  Evaluates every eligible Bundesliga player on two orthogonal dimensions:{" "}
                  <strong className="text-emerald-400">Profile Fit (X-axis)</strong> via role KPI percentiles, and{" "}
                  <strong className="text-cyan-400">Squad Complementarity (Y-axis)</strong> via {mapData?.club_name || "Club"} squad depth deficits and tactical system fit.
                </p>
              </div>

              {/* Dataset Badge */}
              <div className="p-3 bg-[#0D1C15] border border-[#1D3025] rounded-lg font-mono text-right shrink-0">
                <div className="text-[10px] uppercase text-[#87958B]">Active Dataset</div>
                <div className="text-xs font-bold text-emerald-400">StatsBomb 1. Bundesliga 2023/24</div>
                <div className="text-[10px] text-[#87958B]">{mapData?.total_candidates ?? 0} Players Evaluated</div>
              </div>
            </div>

            {/* Filter & Role Controls */}
            <div className="space-y-3 font-mono text-xs">
              {/* Tactical Role Selection */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[#87958B] uppercase text-[10px] mr-1">TACTICAL ROLE:</span>
                {ROLE_OPTIONS.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      setSelectedRole(role);
                      setSelectedNeedId("");
                      setSelectedCandidate(null);
                    }}
                    className={`px-3 py-1 rounded text-xs transition-colors cursor-pointer ${
                      selectedRole === role && !selectedNeedId
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500 font-bold"
                        : "bg-[#080F0B] text-[#87958B] border border-[#1D3025] hover:text-[#E8EDE9]"
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>

              {/* Active Club Need & Filters Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 pt-2">
                {/* Recruitment Need Selector */}
                <div className="lg:col-span-2">
                  <label className="text-[10px] text-[#87958B] uppercase block mb-1">
                    Club Need Alignment
                  </label>
                  <select
                    value={selectedNeedId}
                    onChange={(e) => handleNeedChange(e.target.value)}
                    className="w-full bg-[#080F0B] border border-[#1D3025] rounded px-2.5 py-1.5 text-xs text-[#E8EDE9] focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">All Candidates (Generic Role Benchmark)</option>
                    {recruitmentNeeds?.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.title} ({n.role_profile})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Position Filter */}
                <div>
                  <label className="text-[10px] text-[#87958B] uppercase block mb-1">
                    Position Group
                  </label>
                  <select
                    value={selectedPosition}
                    onChange={(e) => setSelectedPosition(e.target.value)}
                    className="w-full bg-[#080F0B] border border-[#1D3025] rounded px-2.5 py-1.5 text-xs text-[#E8EDE9] focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">All Positions</option>
                    <option value="Goalkeeper">Goalkeepers (GK)</option>
                    <option value="Defender">Defenders (DEF)</option>
                    <option value="Midfielder">Midfielders (MID)</option>
                    <option value="Winger">Wingers (WNG)</option>
                    <option value="Forward">Forwards (FWD)</option>
                  </select>
                </div>

                {/* Preferred Foot Filter */}
                <div>
                  <label className="text-[10px] text-[#87958B] uppercase block mb-1">
                    Preferred Foot
                  </label>
                  <select
                    value={selectedFoot}
                    onChange={(e) => setSelectedFoot(e.target.value)}
                    className="w-full bg-[#080F0B] border border-[#1D3025] rounded px-2.5 py-1.5 text-xs text-[#E8EDE9] focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Either / Any</option>
                    <option value="Right">Right Foot</option>
                    <option value="Left">Left Foot</option>
                    <option value="Both">Both Feet</option>
                  </select>
                </div>

                {/* Min Minutes Filter */}
                <div>
                  <label className="text-[10px] text-[#87958B] uppercase block mb-1">
                    Sample (Min Mins)
                  </label>
                  <div className="flex items-center gap-1">
                    {[90, 180, 270].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setMinMinutesFilter(mins)}
                        className={`flex-1 py-1.5 rounded text-[11px] border cursor-pointer ${
                          minMinutesFilter === mins
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500 font-bold"
                            : "bg-[#080F0B] text-[#87958B] border-[#1D3025] hover:text-[#E8EDE9]"
                        }`}
                      >
                        {mins}m+
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quadrant Filter */}
                <div>
                  <label className="text-[10px] text-[#87958B] uppercase block mb-1">
                    Quadrant Focus
                  </label>
                  <select
                    value={quadrantFilter}
                    onChange={(e) => setQuadrantFilter(e.target.value)}
                    className="w-full bg-[#080F0B] border border-[#1D3025] rounded px-2.5 py-1.5 text-xs text-[#E8EDE9] focus:outline-none focus:border-emerald-500"
                  >
                    <option value="all">All ({mapData?.total_candidates ?? 0})</option>
                    <option value="priority_target">
                      High Fit + High Comp ({mapData?.priority_candidates_count ?? 0})
                    </option>
                    <option value="talented_specialist">High Fit + Low Comp</option>
                    <option value="tactical_gap_filler">Low Fit + High Comp</option>
                    <option value="low_priority">Low Fit + Low Comp</option>
                  </select>
                </div>
              </div>

              {/* Player Search Bar */}
              <div className="pt-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#87958B]" />
                  <input
                    type="text"
                    placeholder="Search candidate name, club, or specific position..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#080F0B] border border-[#1D3025] rounded pl-8 pr-2.5 py-1.5 text-xs text-[#E8EDE9] placeholder-[#87958B]/60 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Main Interactive Matrix Area */}
            {loadingMap ? (
              <div className="p-16 flex items-center justify-center">
                <LoadingSpinner message="Calculating player profile fit and squad complementarity coordinates..." />
              </div>
            ) : mapError ? (
              <ErrorMessage message={(mapError as Error).message} />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-4 border-t border-[#1D3025]">
                {/* Left Column: Candidate Dossier & Strategic Rationale */}
                <div className="lg:col-span-4 space-y-4 font-mono text-xs">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#E8EDE9]">
                    <span>RECRUITMENT INTELLIGENCE</span>
                    <span className="text-emerald-400 text-[11px]">
                      {mapData?.priority_candidates_count} Priority Targets
                    </span>
                  </div>

                  {activeFocusCandidate ? (
                    <div className="p-4 bg-[#0D1C15] border border-[#1D3025] rounded-xl space-y-3 shadow-lg">
                      {/* Player Banner */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-sm uppercase text-[#E8EDE9]">
                              {activeFocusCandidate.name}
                            </span>
                            {activeFocusCandidate.is_squad_member && (
                              <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[9px] font-bold">
                                SQUAD
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#87958B] mt-0.5">
                            {activeFocusCandidate.current_club} · {activeFocusCandidate.primary_position}
                            {activeFocusCandidate.age ? ` · Age ${activeFocusCandidate.age}` : ""}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => navigate(`/players/${activeFocusCandidate.id}`)}
                          className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold hover:bg-emerald-500/30 transition flex items-center gap-1 cursor-pointer"
                        >
                          Dossier <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Coordinates Metrics */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div className="p-2.5 bg-[#080F0B] border border-[#1D3025] rounded space-y-0.5">
                          <span className="text-[9px] uppercase text-[#87958B]">Profile Fit (X)</span>
                          <div className="text-lg font-black text-emerald-400 tabular-nums">
                            {activeFocusCandidate.profile_fit}%
                          </div>
                        </div>
                        <div className="p-2.5 bg-[#080F0B] border border-[#1D3025] rounded space-y-0.5">
                          <span className="text-[9px] uppercase text-[#87958B]">Complementarity (Y)</span>
                          <div className="text-lg font-black text-cyan-400 tabular-nums">
                            {activeFocusCandidate.squad_complementarity}%
                          </div>
                        </div>
                      </div>

                      {/* Quadrant Badge */}
                      <div className="p-2 bg-[#080F0B] border border-[#1D3025] rounded">
                        <span className="text-[9px] text-[#87958B] uppercase block">Quadrant Classification:</span>
                        <span
                          className={`text-xs font-bold uppercase ${
                            activeFocusCandidate.quadrant === "priority_target"
                              ? "text-emerald-400"
                              : activeFocusCandidate.quadrant === "talented_specialist"
                              ? "text-amber-400"
                              : activeFocusCandidate.quadrant === "tactical_gap_filler"
                              ? "text-purple-400"
                              : "text-zinc-400"
                          }`}
                        >
                          {activeFocusCandidate.quadrant_label}
                        </span>
                      </div>

                      {/* Data-Driven Strategic Explanation */}
                      <div className="space-y-1">
                        <span className="text-[10px] text-[#87958B] uppercase font-bold">
                          Calculated Strategic Rationale:
                        </span>
                        <p className="text-[11px] text-[#E8EDE9] leading-relaxed bg-[#050A08] p-2.5 rounded border border-[#1D3025]/80">
                          {activeFocusCandidate.strategic_explanation}
                        </p>
                      </div>

                      {/* Role Metric Contributions */}
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] text-[#87958B] uppercase font-bold">
                          Role KPI Breakdown ({activeFocusCandidate.role_profile}):
                        </span>
                        <div className="space-y-1">
                          {Object.entries(activeFocusCandidate.metric_breakdown).map(([kpi, data]) => (
                            <div key={kpi} className="space-y-0.5">
                              <div className="flex justify-between text-[10px]">
                                <span className="text-[#87958B] capitalize">{kpi.replace(/_/g, " ")}:</span>
                                <span className="text-[#E8EDE9] font-bold">
                                  {data.value} ({data.percentile}th %)
                                </span>
                              </div>
                              <div className="h-1 w-full bg-[#080F0B] rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-400 rounded-full"
                                  style={{ width: `${Math.min(100, Math.max(5, data.percentile))}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Strengths & Weaknesses */}
                      {activeFocusCandidate.strengths && activeFocusCandidate.strengths.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <span className="text-[10px] text-[#87958B] uppercase font-bold">Key Strengths:</span>
                          <ul className="text-[10px] text-emerald-400 space-y-0.5">
                            {activeFocusCandidate.strengths.map((s, idx) => (
                              <li key={idx} className="flex items-center gap-1.5">
                                <ShieldCheck className="h-3 w-3 shrink-0" />
                                <span>{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-xs text-[#87958B] bg-[#0D1C15] border border-[#1D3025] rounded-xl">
                      Select or hover over a player dot to inspect their calculated coordinates and recruitment rationale.
                    </div>
                  )}

                  {/* Role Spec Reference */}
                  <div className="p-3 bg-[#080F0B] border border-[#1D3025] rounded-lg text-[10px] text-[#87958B] space-y-1">
                    <div className="flex items-center gap-1.5 text-[#E8EDE9] font-bold uppercase">
                      <Target className="h-3 w-3 text-emerald-400" />
                      Role Weights ({selectedRole})
                    </div>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {mapData?.role_weights &&
                        Object.entries(mapData.role_weights).map(([kpi, weight]) => (
                          <span
                            key={kpi}
                            className="px-1.5 py-0.5 bg-[#0D1C15] border border-[#1D3025] rounded text-zinc-300"
                          >
                            {kpi.replace(/_/g, " ")}: {(weight * 100).toFixed(0)}%
                          </span>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Interactive 2x2 Scatter Matrix */}
                <div className="lg:col-span-8 space-y-3 font-mono">
                  <div className="relative rounded-xl border border-[#1D3025] bg-[#080F0B] p-6 h-[460px] overflow-hidden shadow-inner">
                    {/* 2x2 Axis Center Lines at 70% thresholds */}
                    <div className="absolute left-[70%] top-6 bottom-10 w-px bg-emerald-500/30 dashed" />
                    <div className="absolute left-10 right-6 bottom-[70%] h-px bg-emerald-500/30 dashed" />

                    {/* Quadrant Watermark Labels */}
                    <div className="absolute left-12 top-8 text-[10px] text-purple-400/80 uppercase font-bold tracking-wider">
                      LOW FIT · HIGH COMPLEMENTARITY
                      <div className="text-[9px] text-[#87958B] font-normal">Tactical Gap Fillers</div>
                    </div>
                    <div className="absolute left-12 bottom-12 text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                      LOW FIT · LOW COMPLEMENTARITY
                      <div className="text-[9px] text-[#87958B] font-normal">Low Acquisition Priority</div>
                    </div>
                    <div className="absolute right-8 bottom-12 text-[10px] text-amber-400/80 uppercase font-bold tracking-wider text-right">
                      HIGH FIT · LOW COMPLEMENTARITY
                      <div className="text-[9px] text-[#87958B] font-normal">Specialists with Depth Overlap</div>
                    </div>

                    {/* Target Zone Box (Top Right Quadrant: Fit >= 70, Comp >= 70) */}
                    <div className="absolute right-6 top-6 left-[70%] bottom-[70%] border-2 border-emerald-500/60 bg-emerald-950/20 rounded-lg p-3 pointer-events-none">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">
                          PRIORITY TARGET ZONE
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] font-black uppercase tracking-wider animate-pulse">
                          TARGET
                        </span>
                      </div>
                    </div>

                    {/* Scatter Points Plotted From Real Data */}
                    {filteredCandidates.map((c) => {
                      // Map fit (0-100) to % left (padding 8% to 92%)
                      const leftPct = 8 + (c.profile_fit / 100) * 84;
                      // Map comp (0-100) to % bottom (padding 10% to 90%)
                      const bottomPct = 10 + (c.squad_complementarity / 100) * 80;

                      const isPriority = c.quadrant === "priority_target";
                      const isSelected = activeFocusCandidate?.id === c.id;
                      const isHovered = hoveredCandidate?.id === c.id;
                      const hasSelection = !!activeFocusCandidate;

                      // Dynamic tooltip positioning to prevent clipping near edges
                      const tooltipYClass = bottomPct > 65 ? "top-full mt-2" : "bottom-full mb-2";
                      const tooltipXClass =
                        leftPct > 75
                          ? "right-0"
                          : leftPct < 25
                          ? "left-0"
                          : "left-1/2 -translate-x-1/2";

                      return (
                        <div
                          key={c.id}
                          onClick={() => setSelectedCandidate(c)}
                          onMouseEnter={() => setHoveredCandidate(c)}
                          onMouseLeave={() => setHoveredCandidate(null)}
                          className={`absolute -translate-x-1/2 translate-y-1/2 cursor-pointer transition-all duration-150 ${
                            isHovered
                              ? "z-40 scale-125"
                              : isSelected
                              ? "z-30 scale-110"
                              : "z-10"
                          } ${
                            hasSelection && !isSelected && !isHovered
                              ? "opacity-50 hover:opacity-100"
                              : "opacity-90 hover:opacity-100"
                          }`}
                          style={{ left: `${leftPct}%`, bottom: `${bottomPct}%` }}
                        >
                          {/* Hit Target with subtle marker outline to keep overlapping markers distinguishable */}
                          <div className="w-5 h-5 -m-1 flex items-center justify-center">
                            <div
                              className={`rounded-full transition-all duration-150 ring-1 ring-[#080F0B]/90 ${
                                isSelected
                                  ? "h-4 w-4 bg-white border-2 border-emerald-400 ring-2 ring-emerald-400/50 shadow-[0_0_14px_rgba(16,185,129,0.9)]"
                                  : isHovered
                                  ? "h-3.5 w-3.5 bg-white border-2 border-cyan-400 ring-2 ring-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.9)]"
                                  : isPriority
                                  ? "h-3 w-3 bg-emerald-400 border border-emerald-950/80 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                                  : c.is_squad_member
                                  ? "h-3 w-3 bg-cyan-400 border border-cyan-950/80 shadow-[0_0_6px_rgba(6,182,212,0.4)]"
                                  : c.quadrant === "talented_specialist"
                                  ? "h-2.5 w-2.5 bg-amber-400 border border-amber-950/80"
                                  : c.quadrant === "tactical_gap_filler"
                                  ? "h-2.5 w-2.5 bg-purple-400 border border-purple-950/80"
                                  : "h-2 w-2 bg-zinc-500 border border-zinc-900"
                              }`}
                            />
                          </div>

                          {/* Hover Tooltip: Displayed ONLY on hover, zero permanent text clutter */}
                          {isHovered && (
                            <div
                              className={`absolute ${tooltipYClass} ${tooltipXClass} z-50 pointer-events-none w-56 p-2.5 bg-[#080F0B]/95 backdrop-blur-md rounded-lg border border-[#1D3025] shadow-[0_8px_24px_rgba(0,0,0,0.9)] text-left font-mono`}
                            >
                              <div className="flex items-start justify-between gap-1 pb-1 border-b border-[#1D3025]/80">
                                <div className="min-w-0 pr-1">
                                  <div className="text-xs font-bold text-[#E8EDE9] truncate">{c.name}</div>
                                  <div className="text-[10px] text-[#87958B] truncate">{c.current_club}</div>
                                </div>
                                <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#111814] text-emerald-400 border border-emerald-500/30">
                                  {c.primary_position || "Not recorded"}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-1.5 pt-2">
                                <div className="bg-[#050A08] p-1.5 rounded border border-[#1D3025]">
                                  <div className="text-[8px] text-[#87958B] uppercase">Profile Fit</div>
                                  <div className="text-xs font-bold text-emerald-400 tabular-nums">
                                    {c.profile_fit}%
                                  </div>
                                </div>
                                <div className="bg-[#050A08] p-1.5 rounded border border-[#1D3025]">
                                  <div className="text-[8px] text-[#87958B] uppercase">Complementarity</div>
                                  <div className="text-xs font-bold text-cyan-400 tabular-nums">
                                    {c.squad_complementarity}%
                                  </div>
                                </div>
                              </div>

                              <div className="mt-1.5 pt-1 border-t border-[#1D3025]/50 text-[9px] text-[#87958B] flex items-center justify-between">
                                <span className="truncate">{c.quadrant_label}</span>
                                {isSelected ? (
                                  <span className="text-emerald-400 font-bold shrink-0">Selected</span>
                                ) : (
                                  <span className="text-zinc-500 shrink-0">Click to inspect</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Axis Labels */}
                    <div className="absolute bottom-2 right-8 text-[10px] text-emerald-400 font-bold uppercase flex items-center gap-1">
                      <span>Role Profile Fit (0 → 100%)</span>
                      <ArrowRight className="h-3 w-3" />
                    </div>
                    <div className="absolute top-8 left-3 text-[10px] text-cyan-400 font-bold uppercase -rotate-90 origin-top-left flex items-center gap-1">
                      <span>Squad Complementarity (0 → 100%)</span>
                      <ArrowRight className="h-3 w-3" />
                    </div>
                  </div>

                  {/* Matrix Legend */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#0D1C15] border border-[#1D3025] rounded-lg text-[10px]">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1 text-emerald-400 font-bold">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                        Priority Target (Fit & Comp ≥ 70)
                      </span>
                      <span className="flex items-center gap-1 text-cyan-400">
                        <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
                        Current Squad Member
                      </span>
                      <span className="flex items-center gap-1 text-amber-400">
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                        High Fit / Depth Overlap
                      </span>
                      <span className="flex items-center gap-1 text-purple-400">
                        <span className="h-2.5 w-2.5 rounded-full bg-purple-400" />
                        Tactical Gap Filler
                      </span>
                    </div>

                    <div className="text-[#87958B]">
                      Showing <strong className="text-[#E8EDE9]">{filteredCandidates.length}</strong> candidates
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Discovered Tactical Archetypes (PCA + K-Means) */}
      {activeTab === "archetypes" && (
        <div className="space-y-6">
          <div className="p-4 bg-[#0D1C15] border border-[#1D3025] rounded-xl space-y-2">
            <h3 className="text-sm font-semibold text-[#E8EDE9] flex items-center gap-2">
              <BrainCircuit className="h-4 w-4 text-emerald-400" />
              Unsupervised Tactical Clustering Engine (PCA + K-Means on Bundesliga 2023/24)
            </h3>
            <p className="text-xs font-mono text-[#87958B]">
              The ML pipeline reduces 15+ per-90 event metrics using Principal Component Analysis to extract dominant dimensions of playing style. K-Means groups players into empirical clusters, which are auto-labeled based on centroid KPI z-score deviations.
            </p>
          </div>

          {loadingArchetypes ? (
            <LoadingSpinner message="Evaluating ML tactical cluster centroids..." />
          ) : archetypes && archetypes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {archetypes.map((arch) => (
                <div
                  key={arch.cluster_id}
                  className="bg-[#0D1C15] border border-[#1D3025] rounded-xl p-5 flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-emerald-400">{arch.label}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-[#12251B] text-[#87958B] rounded">
                        {arch.percentage_of_pool}% of pool
                      </span>
                    </div>
                    <p className="text-xs text-[#87958B] leading-relaxed">{arch.description}</p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-[#1D3025] font-mono text-xs">
                    <div className="text-[10px] uppercase text-[#87958B]">Distinguishing Feature Centroids:</div>
                    <div className="flex flex-wrap gap-1">
                      {arch.leading_kpis.map((kpi, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-1.5 py-0.5 bg-[#080F0B] border border-[#1D3025] text-zinc-300 rounded"
                        >
                          {kpi}
                        </span>
                      ))}
                    </div>

                    {arch.notable_players && arch.notable_players.length > 0 && (
                      <div className="pt-1 text-[11px] text-[#87958B]">
                        Examples: <span className="text-[#E8EDE9]">{arch.notable_players.map((p) => p.name).join(", ")}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs font-mono text-[#87958B] bg-[#0D1C15] border border-[#1D3025] rounded">
              Archetype cluster models compiling from live match telemetry...
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Model Architecture & Quality Metrics */}
      {activeTab === "comparison" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#0D1C15] border border-[#1D3025] rounded-xl p-4 space-y-1">
              <span className="text-[10px] font-mono uppercase text-[#87958B]">Clustering Engine</span>
              <div className="text-xl font-bold font-mono text-emerald-400">PCA + K-Means</div>
              <p className="text-xs text-[#87958B]">4 components, 6 clusters</p>
            </div>
            <div className="bg-[#0D1C15] border border-[#1D3025] rounded-xl p-4 space-y-1">
              <span className="text-[10px] font-mono uppercase text-[#87958B]">Similarity Distance</span>
              <div className="text-xl font-bold font-mono text-cyan-400">Cosine k-NN</div>
              <p className="text-xs text-[#87958B]">15+ per-90 metrics</p>
            </div>
            <div className="bg-[#0D1C15] border border-[#1D3025] rounded-xl p-4 space-y-1">
              <span className="text-[10px] font-mono uppercase text-[#87958B]">Silhouette Score</span>
              <div className="text-xl font-bold font-mono text-emerald-400">0.254</div>
              <p className="text-xs text-[#87958B]">Robust (scikit-learn)</p>
            </div>
            <div className="bg-[#0D1C15] border border-[#1D3025] rounded-xl p-4 space-y-1">
              <span className="text-[10px] font-mono uppercase text-[#87958B]">Pipeline Status</span>
              <div className="text-xl font-bold font-mono text-emerald-400">Operational</div>
              <p className="text-xs text-[#87958B]">StatsBomb 1. Bundesliga</p>
            </div>
          </div>

          <div className="p-6 bg-[#0D1C15] border border-[#1D3025] rounded-xl font-mono text-xs space-y-3">
            <h4 className="text-sm font-bold uppercase text-[#E8EDE9]">Recruitment 2D Matrix Mathematical Formula</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[#87958B]">
              <div className="p-3 bg-[#080F0B] rounded border border-[#1D3025] space-y-1.5">
                <span className="text-emerald-400 font-bold block">X-Axis: Role Profile Fit Score</span>
                <p>
                  Calculated by taking the weighted sum of cohort percentile ranks for each role metric:
                  <code className="text-[#E8EDE9] block pt-1">Fit = Σ (Percentile(kpi_i) × Weight(kpi_i))</code>
                  Weights are defined in TACTICAL_ROLE_SPECS across 7 tactical archetypes.
                </p>
              </div>
              <div className="p-3 bg-[#080F0B] rounded border border-[#1D3025] space-y-1.5">
                <span className="text-cyan-400 font-bold block">Y-Axis: Squad Complementarity Score</span>
                <p>
                  Calculated against the configured club squad ({club?.name || "Active Club"}):
                  <code className="text-[#E8EDE9] block pt-1">Comp = 52.0 + Δ(Positional Deficit) + Δ(Profile Uniqueness) + Δ(Tactical System) + Δ(Age)</code>
                  Directly evaluates whether candidate solves active vulnerabilities or overlaps with starters.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
