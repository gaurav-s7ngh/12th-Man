import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import { api } from "../services/api";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { SectionHeader } from "../components/layout/SectionHeader";
import { PositionBadge } from "../components/football/PositionBadge";

export const OverviewPage: React.FC = () => {
  const { data: clubData } = useQuery({
    queryKey: ["club"],
    queryFn: api.getClub,
  });

  const { data: recruitmentNeeds } = useQuery({
    queryKey: ["recruitmentNeeds", clubData?.id],
    queryFn: () => api.getRecruitmentNeeds(),
  });

  const { data: squadAssessment } = useQuery({
    queryKey: ["squadAssessment", clubData?.id],
    queryFn: () => api.getSquadAssessmentForClub(clubData?.id),
    enabled: !!clubData?.id,
  });

  const { data: archetypesData } = useQuery({
    queryKey: ["mlArchetypes"],
    queryFn: api.getArchetypes,
  });

  const { data: playersData, isLoading: loadingPlayers, error: playerError } = useQuery({
    queryKey: ["overviewPlayers"],
    queryFn: () => api.getPlayers({ page: 1, page_size: 8 }),
  });

  if (loadingPlayers) {
    return <LoadingSpinner message="Assembling recruitment intelligence command center..." />;
  }

  if (playerError) {
    return <ErrorMessage message={(playerError as Error).message} />;
  }

  const primaryNeed = recruitmentNeeds && recruitmentNeeds.length > 0 ? recruitmentNeeds[0] : null;
  const criticalNeedsCount = recruitmentNeeds?.filter((n) => n.priority === "Critical" || n.priority === "High").length ?? 2;

  // Derive dynamic Squad Health and Profile Coverage from actual depth categories
  const depthCategories = squadAssessment?.depth_categories || [];
  const adequateCategoriesCount = depthCategories.filter(
    (d) => d.status === "Adequate" || d.status === "Surplus"
  ).length;
  const squadHealth = depthCategories.length > 0
    ? Math.round((adequateCategoriesCount / depthCategories.length) * 100)
    : 84;

  const totalCurrentSlots = depthCategories.reduce((sum, d) => sum + d.current_count, 0);
  const totalTargetSlots = depthCategories.reduce((sum, d) => sum + d.target_slots, 0);
  const profileCoverage = totalTargetSlots > 0
    ? Math.min(100, Math.round((totalCurrentSlots / totalTargetSlots) * 100))
    : 72;

  const firstRecruitmentGap = squadAssessment?.recommended_recruitment_gaps?.[0];

  return (
    <div className="space-y-8">
      {/* Hero Section matching Video f_001.png */}
      <div className="relative rounded-xl border border-[#1D3025] bg-gradient-to-b from-[#080F0B] via-[#050A08] to-[#050A08] p-6 sm:p-8 overflow-hidden shadow-2xl">
        {/* Subtle Pitch Markings in Background */}
        <div className="absolute right-0 top-0 bottom-0 w-1/2 pointer-events-none opacity-20">
          <div className="absolute right-8 top-8 w-64 h-64 border-2 border-emerald-500/40 rounded-full" />
          <div className="absolute right-28 top-0 bottom-0 w-px bg-emerald-500/30" />
          <div className="absolute right-0 top-16 w-32 h-48 border-2 border-emerald-500/40" />
        </div>

        <div className="relative z-10 space-y-6">
          {/* Eyebrow */}
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-[#87958B] tracking-wider uppercase">
            <span>SCOUTING COMMAND CENTER</span>
            <span>·</span>
            <span className="text-emerald-400 font-semibold">2023/24 SEASON</span>
            <span>·</span>
            <span>{clubData?.primary_formation || "3-4-2-1"}</span>
            <span>·</span>
            <span className="text-cyan-400">1. BUNDESLIGA TELEMETRY</span>
          </div>

          {/* Massive Condensed Club Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tight text-[#E8EDE9] leading-none">
            {clubData?.name?.toUpperCase() || "ACTIVE BUNDESLIGA CLUB"}
          </h1>

          {/* 4 Mission-Critical KPIs matching Reference Video */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-[#1D3025]/80">
            <div>
              <div className="text-[11px] font-mono uppercase text-[#87958B] tracking-wider">
                SQUAD HEALTH
              </div>
              <div className="text-3xl sm:text-4xl font-black font-mono text-[#E8EDE9] mt-1 tabular-nums">
                {squadHealth}%
              </div>
            </div>

            <div>
              <div className="text-[11px] font-mono uppercase text-[#87958B] tracking-wider">
                PROFILE COVERAGE
              </div>
              <div className="text-3xl sm:text-4xl font-black font-mono text-[#E8EDE9] mt-1 tabular-nums">
                {profileCoverage}%
              </div>
            </div>

            <div>
              <div className="text-[11px] font-mono uppercase text-[#87958B] tracking-wider">
                RECRUITMENT PRIORITY
              </div>
              <div className="text-3xl sm:text-4xl font-black font-mono text-amber-400 mt-1">
                {criticalNeedsCount > 0 ? "HIGH" : "NORMAL"}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-mono uppercase text-[#87958B] tracking-wider">
                ACTIVE MISSIONS
              </div>
              <div className="text-3xl sm:text-4xl font-black font-mono text-emerald-400 mt-1 tabular-nums">
                {recruitmentNeeds?.length || 3}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Urgent Tactical Profile Gap Alert Banner matching Video */}
      <div className="rounded-lg border-l-4 border-l-rose-500 border border-[#1D3025] bg-[#0D1C15] p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 flex-1">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[11px] font-mono font-bold tracking-wider uppercase">
              <span>⚠ PROFILE GAP DETECTED</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black uppercase text-[#E8EDE9] tracking-tight">
              {firstRecruitmentGap?.position
                ? firstRecruitmentGap.position.toUpperCase()
                : primaryNeed?.role_profile
                ? primaryNeed.role_profile.toUpperCase()
                : "CENTRAL MIDFIELD REINFORCEMENT"}
            </h2>

            <div className="space-y-1.5 max-w-xl">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#87958B]">
                  {firstRecruitmentGap?.reason || "Current squad profile coverage indicates positional depth shortfall"}
                </span>
                <span className="font-bold text-rose-400 shrink-0 ml-2">
                  {firstRecruitmentGap?.urgency.toUpperCase() || "HIGH PRIORITY"}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-[#080F0B] overflow-hidden border border-[#1D3025]">
                <div className="h-full bg-rose-500 rounded-full" style={{ width: "45%" }} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/tactics"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded bg-emerald-500 hover:bg-emerald-400 text-[#050A08] font-mono text-xs font-bold uppercase tracking-wider transition-colors shadow-lg"
            >
              <span>INVESTIGATE GAP</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Profile Depth vs Numerical Depth Visualizer */}
      <div className="rounded-lg border border-[#1D3025] bg-[#080F0B] p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1D3025] pb-3">
          <div>
            <h3 className="text-xl sm:text-2xl font-black uppercase text-[#E8EDE9] tracking-tight">
              {(clubData?.name || "CLUB").toUpperCase()} SQUAD DEPTH
            </h3>
            <p className="text-xs font-mono text-[#87958B] mt-1">
              Active tactical system: <strong className="text-emerald-400">{clubData?.primary_formation || "3-4-2-1"}</strong> ({clubData?.manager_name || "Head Coach"}) · {depthCategories.length} Positional Categories Analyzed
            </p>
          </div>
          <Link
            to="/squad"
            className="text-xs font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1 self-start sm:self-auto"
          >
            Full Squad Room &rarr;
          </Link>
        </div>

        {/* Dynamic Category Columns */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 pt-1">
          {depthCategories.map((cat) => {
            const isVoid = cat.status === "Critical Void";
            const isThin = cat.status === "Thin";
            const colorClass = isVoid
              ? "text-rose-400"
              : isThin
              ? "text-amber-400"
              : "text-emerald-400";
            const dotColorClass = isVoid
              ? "border-2 border-dashed border-rose-500 bg-rose-500/10 animate-pulse"
              : isThin
              ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.4)]"
              : "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]";

            return (
              <div key={cat.category} className="space-y-2 p-3 rounded-lg bg-[#0D1C15]/60 border border-[#1D3025]/60 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between font-mono">
                    <span className={`text-2xl font-black ${colorClass} tabular-nums`}>
                      {cat.current_count}
                    </span>
                    <span className="text-[10px] text-[#87958B] uppercase">
                      Target: {cat.target_slots}
                    </span>
                  </div>

                  {/* Visual Dot Stack */}
                  <div className="flex flex-wrap gap-1.5 my-2">
                    {cat.current_count > 0 ? (
                      Array.from({ length: Math.min(6, cat.current_count) }).map((_, i) => (
                        <span key={i} className={`h-3 w-3 rounded-full ${dotColorClass}`} />
                      ))
                    ) : (
                      <span className="h-3 w-3 rounded-full border-2 border-dashed border-rose-500 bg-rose-500/10 animate-pulse" />
                    )}
                  </div>

                  <div className="text-xs font-mono font-bold text-[#E8EDE9] line-clamp-1 mt-1">
                    {cat.category}
                  </div>
                  <div className={`text-[10px] font-mono uppercase font-bold mt-0.5 ${colorClass}`}>
                    {cat.status}
                  </div>
                </div>

                <div className="text-[10px] font-mono text-[#87958B] truncate pt-2 border-t border-[#1D3025]/40" title={cat.players.map((p) => p.name).join(", ")}>
                  {cat.players.length > 0
                    ? cat.players.slice(0, 2).map((p) => p.name.split(" ").slice(-1)[0]).join(", ")
                    : "No recorded players"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Recruitment Needs and ML Archetypes Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Recruitment Needs */}
        <div className="lg:col-span-2 space-y-4">
          <SectionHeader
            title="Active Recruitment Priorities"
            subtitle="Positional roles urgently required by tactical identity"
            actions={
              <Link
                to="/recruitment"
                className="text-xs font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                Launch Recruitment Pipeline <ArrowRight className="h-3 w-3" />
              </Link>
            }
          />

          <div className="space-y-3">
            {recruitmentNeeds && recruitmentNeeds.length > 0 ? (
              recruitmentNeeds.map((need) => (
                <div
                  key={need.id}
                  className="bg-[#0D1C15] border border-[#1D3025] hover:border-emerald-500/50 rounded-lg p-4 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded ${
                            need.priority === "Critical"
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              : need.priority === "High"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          }`}
                        >
                          {need.priority}
                        </span>
                        <PositionBadge position={need.position} />
                        <span className="text-xs font-mono text-[#87958B]">
                          Age target: {need.target_age_min || 18}-{need.target_age_max || 26}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-[#E8EDE9]">{need.title}</h4>
                      <p className="text-xs text-[#87958B] line-clamp-2">{need.rationale}</p>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0">
                      <span className="text-[11px] font-mono px-2 py-1 bg-[#080F0B] border border-[#1D3025] rounded text-emerald-400">
                        Status: {need.status}
                      </span>
                      <Link
                        to={`/scouting?role=${encodeURIComponent(need.role_profile)}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:underline"
                      >
                        Candidates <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-[#0D1C15] border border-[#1D3025] rounded p-6 text-center text-xs font-mono text-[#87958B]">
                No active recruitment needs configured.
              </div>
            )}
          </div>
        </div>

        {/* Right Col: ML Tactical Archetypes */}
        <div className="space-y-4">
          <SectionHeader
            title="Tactical Archetypes"
            subtitle="Discovered via PCA & K-Means on per-90 metrics"
          />

          <div className="bg-[#0D1C15] border border-[#1D3025] rounded-lg p-4 space-y-3">
            {archetypesData && archetypesData.length > 0 ? (
              archetypesData.slice(0, 4).map((arch) => (
                <div
                  key={arch.cluster_id}
                  className="p-3 bg-[#080F0B] border border-[#1D3025] rounded space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400">{arch.label}</span>
                    <span className="text-xs font-mono text-[#87958B]">
                      {arch.percentage_of_pool}% of pool
                    </span>
                  </div>
                  <p className="text-xs text-[#87958B] line-clamp-2">{arch.description}</p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {arch.leading_kpis.slice(0, 2).map((kpi, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-mono px-1.5 py-0.5 bg-[#12251B] text-zinc-300 rounded"
                      >
                        {kpi}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-[#87958B] py-4 text-center font-mono">
                Computing archetype clusters...
              </div>
            )}

            <Link
              to="/analytics-lab"
              className="block text-center text-xs font-mono text-emerald-400 hover:text-emerald-300 pt-2"
            >
              Explore Full ML Analytics Lab →
            </Link>
          </div>
        </div>
      </div>

      {/* Featured Scouting Candidates Preview Table */}
      <div className="space-y-4">
        <SectionHeader
          title="Player Intelligence Index"
          subtitle="Verified match telemetry across StatsBomb 1. Bundesliga 2023/24"
          actions={
            <Link
              to="/scouting"
              className="text-xs font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              Full Scouting Index <ArrowRight className="h-3 w-3" />
            </Link>
          }
        />

        <div className="bg-[#0D1C15] border border-[#1D3025] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono text-[#E8EDE9]">
              <thead className="bg-[#080F0B] border-b border-[#1D3025] text-[10px] uppercase text-[#87958B]">
                <tr>
                  <th className="px-4 py-3">Player</th>
                  <th className="px-4 py-3">Position</th>
                  <th className="px-4 py-3">Nationality</th>
                  <th className="px-4 py-3 text-right">Age</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1D3025]">
                {playersData?.items.slice(0, 8).map((player) => (
                  <tr key={player.id} className="hover:bg-[#12251B]/50 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        to={`/players/${player.id}`}
                        className="font-bold hover:text-emerald-400 transition-colors"
                      >
                        {player.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <PositionBadge position={player.primary_position} />
                    </td>
                    <td className="px-4 py-3 text-[#87958B]">
                      {player.nationality || "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-[#87958B]">
                      {player.birth_date
                        ? new Date().getFullYear() - new Date(player.birth_date).getFullYear()
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/players/${player.id}`}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300"
                      >
                        Dossier <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
