import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import { PageHeader } from "../components/layout/PageHeader";
import { SectionHeader } from "../components/layout/SectionHeader";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { getPositionCategory } from "../lib/utils";
import {
  Shield,
  Sliders,
  Layers,
} from "lucide-react";

export const ScenariosPage: React.FC = () => {
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [departingPlayerId, setDepartingPlayerId] = useState("");
  const [incomingCandidateId, setIncomingCandidateId] = useState("");

  // Load teams
  const { data: teams, isLoading: loadingTeams } = useQuery({
    queryKey: ["scenarioTeams"],
    queryFn: api.getTeams,
  });

  // Effective team ID without calling setState in an effect
  const effectiveTeamId = useMemo(() => {
    if (selectedTeamId) return selectedTeamId;
    if (teams && teams.length > 0) return teams[0].id;
    return "";
  }, [teams, selectedTeamId]);

  // Load team squad details
  const { data: teamDetail } = useQuery({
    queryKey: ["scenarioTeamDetail", effectiveTeamId],
    queryFn: () => (effectiveTeamId ? api.getTeam(effectiveTeamId) : Promise.resolve(null)),
    enabled: !!effectiveTeamId,
  });

  // Load player pool for candidate replacement
  const { data: playerPool } = useQuery({
    queryKey: ["scenarioCandidatePool"],
    queryFn: () => api.getPlayers({ page: 1, page_size: 40 }),
  });

  const squad = useMemo(() => teamDetail?.players || [], [teamDetail]);
  const departingPlayer = squad.find((p) => p.id === departingPlayerId);
  const incomingCandidate = playerPool?.items.find((p) => p.id === incomingCandidateId);

  // Calculate before & after positional depth
  const beforeDepth = useMemo(() => {
    const counts = { GK: 0, DEF: 0, MID: 0, FWD: 0, UNRECORDED: 0 };
    squad.forEach((p) => {
      counts[getPositionCategory(p.primary_position)]++;
    });
    return counts;
  }, [squad]);

  const afterDepth = useMemo(() => {
    const counts = { ...beforeDepth };
    if (departingPlayer) {
      const depCat = getPositionCategory(departingPlayer.primary_position);
      counts[depCat] = Math.max(0, counts[depCat] - 1);
    }
    if (incomingCandidate) {
      const incCat = getPositionCategory(incomingCandidate.primary_position);
      counts[incCat]++;
    }
    return counts;
  }, [beforeDepth, departingPlayer, incomingCandidate]);

  if (loadingTeams) {
    return <LoadingSpinner message="Initializing scenario planning workspace..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Recruitment Simulation Foundation"
        title="Squad & Scenario Planning"
        description="Simulate potential squad departures, evaluate positional depth impacts, and compare recruitment candidate replacements based on tournament telemetry."
      />

      {/* Scenario Control Panel */}
      <div className="rounded-lg bg-[#0D1C15] border border-[#1D3025] p-5 font-mono text-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1D3025]">
          <div className="flex items-center gap-2 text-[#10B981] font-bold uppercase text-[11px] tracking-wider">
            <Sliders className="h-3.5 w-3.5" />
            <span>Active Scenario Setup</span>
          </div>

          <div className="flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-[#87958B]" />
            <select
              value={effectiveTeamId}
              onChange={(e) => {
                setSelectedTeamId(e.target.value);
                setDepartingPlayerId("");
              }}
              className="bg-[#080F0B] border border-[#1D3025] rounded px-3 py-1 text-xs text-[#E8EDE9] focus:border-[#10B981] focus:outline-none cursor-pointer"
            >
              {teams?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Departing Player Slot */}
          <div className="p-3.5 rounded bg-[#080F0B] border border-[#1D3025] space-y-2">
            <label className="text-[10px] text-[#EF4444] uppercase font-bold tracking-wider block">
              1. Simulated Outgoing / Departing Player
            </label>
            <select
              value={departingPlayerId}
              onChange={(e) => setDepartingPlayerId(e.target.value)}
              className="w-full bg-[#0D1C15] border border-[#1D3025] rounded p-2 text-xs text-[#E8EDE9] focus:border-[#EF4444] focus:outline-none cursor-pointer"
            >
              <option value="">-- Choose Departing Player (Optional) --</option>
              {squad.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.primary_position || "Not recorded"})
                </option>
              ))}
            </select>
            {departingPlayer && (
              <div className="flex items-center justify-between text-[11px] pt-1 text-[#87958B]">
                <span>Role: {departingPlayer.primary_position || "Not recorded"}</span>
                <span className="text-[#EF4444] font-semibold">-1 from Depth</span>
              </div>
            )}
          </div>

          {/* Incoming Candidate Slot */}
          <div className="p-3.5 rounded bg-[#080F0B] border border-[#1D3025] space-y-2">
            <label className="text-[10px] text-[#10B981] uppercase font-bold tracking-wider block">
              2. Simulated Incoming Candidate Replacement
            </label>
            <select
              value={incomingCandidateId}
              onChange={(e) => setIncomingCandidateId(e.target.value)}
              className="w-full bg-[#0D1C15] border border-[#1D3025] rounded p-2 text-xs text-[#E8EDE9] focus:border-[#10B981] focus:outline-none cursor-pointer"
            >
              <option value="">-- Choose Replacement Candidate (Optional) --</option>
              {playerPool?.items.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.nationality || "—"} • {p.primary_position || "Not recorded"})
                </option>
              ))}
            </select>
            {incomingCandidate && (
              <div className="flex items-center justify-between text-[11px] pt-1 text-[#87958B]">
                <span>Role: {incomingCandidate.primary_position || "Not recorded"}</span>
                <span className="text-[#10B981] font-semibold">+1 to Depth</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Depth Impact Simulation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
        {/* Baseline Squad Depth */}
        <div className="rounded-lg bg-[#0D1C15] border border-[#1D3025] p-5">
          <SectionHeader
            title="Baseline Positional Depth"
            subtitle={`${teamDetail?.name || "Squad"} current tournament roster (${squad.length} players)`}
          />

          <div className="space-y-2.5 mt-3">
            {(["GK", "DEF", "MID", "FWD", "UNRECORDED"] as const).map((cat) => (
              <div
                key={cat}
                className="p-2.5 rounded bg-[#080F0B] border border-[#1D3025] flex items-center justify-between"
              >
                <span className="font-semibold text-[#87958B]">{cat}</span>
                <span className="font-bold text-[#E8EDE9] tabular-nums text-sm">
                  {beforeDepth[cat]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Projected Depth After Scenario */}
        <div className="rounded-lg bg-[#0D1C15] border border-[#1D3025] p-5">
          <SectionHeader
            title="Projected Scenario Depth"
            subtitle="Resulting roster structure after hypothetical moves"
          />

          <div className="space-y-2.5 mt-3">
            {(["GK", "DEF", "MID", "FWD", "UNRECORDED"] as const).map((cat) => {
              const diff = afterDepth[cat] - beforeDepth[cat];
              return (
                <div
                  key={cat}
                  className="p-2.5 rounded bg-[#080F0B] border border-[#1D3025] flex items-center justify-between"
                >
                  <span className="font-semibold text-[#87958B]">{cat}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-[#E8EDE9] tabular-nums text-sm">
                      {afterDepth[cat]}
                    </span>
                    {diff !== 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                          diff > 0
                            ? "bg-[#10B981]/20 text-[#10B981]"
                            : "bg-[#EF4444]/20 text-[#EF4444]"
                        }`}
                      >
                        {diff > 0 ? `+${diff}` : diff}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Transparent Scenario Engineering Disclosure */}
      <div className="p-4 rounded-lg bg-[#0D1C15] border border-[#1D3025] font-mono text-xs space-y-2">
        <div className="flex items-center gap-2 text-[#10B981] font-bold uppercase text-[11px]">
          <Layers className="h-3.5 w-3.5" />
          <span>Scenario Engine Implementation Notice</span>
        </div>
        <p className="text-[11px] text-[#87958B] leading-relaxed">
          The Scenario Planning workspace currently computes deterministic positional depth transformations using verified tournament rosters. Financial wage modeling, contract expiration simulations, and tactical synergy calculations will integrate into this interface as additional database dimensions become available.
        </p>
      </div>
    </div>
  );
};
