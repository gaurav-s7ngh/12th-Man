import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { PageHeader } from "../components/layout/PageHeader";
import { SectionHeader } from "../components/layout/SectionHeader";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { TacticalPitch } from "../components/football/TacticalPitch";
import {
  FORMATION_SLOTS,
  type FormationKey,
  type PitchPositionSlot,
} from "../components/football/formationSlots";
import {
  Save,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

import type { Club } from "../types/football";

export const TacticsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"cluster" | "pitch" | "system">("cluster");

  // Load Club configuration
  const { data: club, isLoading: loadingClub } = useQuery({
    queryKey: ["club"],
    queryFn: api.getClub,
  });

  // Load ML Archetypes
  const { data: archetypes } = useQuery({
    queryKey: ["mlArchetypes"],
    queryFn: api.getArchetypes,
  });

  // User form overrides (avoid set-state-in-effect)
  const [formationOverride, setFormationOverride] = useState<FormationKey | null>(null);
  const [secondaryFormationOverride, setSecondaryFormationOverride] = useState<string | null>(null);
  const [possessionStyleOverride, setPossessionStyleOverride] = useState<string | null>(null);
  const [pressingIntensityOverride, setPressingIntensityOverride] = useState<string | null>(null);
  const [buildUpApproachOverride, setBuildUpApproachOverride] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const formation: FormationKey =
    formationOverride ?? ((club?.primary_formation as FormationKey) || "3-4-2-1");
  const secondaryFormation = secondaryFormationOverride ?? (club?.secondary_formation || "4-2-3-1");
  const possessionStyle =
    possessionStyleOverride ??
    (club?.playing_style?.possession_phase || "High Possession & Fluid Positional Rotations");
  const pressingIntensity =
    pressingIntensityOverride ??
    (club?.playing_style?.pressing_intensity || "Aggressive Counter-Press & High Line");
  const buildUpApproach =
    buildUpApproachOverride ??
    (club?.playing_style?.build_up_approach || "Short passing from back through double pivot");

  // Load squad assessment for tactical gaps
  const { data: squadAssessment } = useQuery({
    queryKey: ["squadAssessment", club?.id],
    queryFn: () => api.getSquadAssessmentForClub(club?.id),
    enabled: !!club?.id,
  });

  // Load squad roster for tactical pitch
  const { data: teamDetail } = useQuery({
    queryKey: ["teamDetail", club?.linked_team_id],
    queryFn: () => (club?.linked_team_id ? api.getTeam(club.linked_team_id) : Promise.resolve(null)),
    enabled: !!club?.linked_team_id,
  });

  const tacticalGap = squadAssessment?.recommended_recruitment_gaps?.[0] || {
    position: "Box-to-Box Engine",
    urgency: "Critical",
    reason: "Current squad depth indicates an acute deficit in dynamic transition and box-to-box ground coverage.",
  };

  const getInitials = (name: string) => {
    const parts = name.split(" ");
    return parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : name.slice(0, 2).toUpperCase();
  };

  const squadPlayers = teamDetail?.players || [];
  const p1 = squadPlayers[0] || { name: "Midfielder A", id: "1" };
  const p2 = squadPlayers[1] || { name: "Midfielder B", id: "2" };
  const p3 = squadPlayers[2] || { name: "Attacker A", id: "3" };
  const p4 = squadPlayers[3] || { name: "Attacker B", id: "4" };
  const p5 = squadPlayers[4] || { name: "Defender A", id: "5" };

  // Pitch slots
  const pitchSlots: PitchPositionSlot[] = useMemo(() => {
    const baseSlots = FORMATION_SLOTS[formation] || FORMATION_SLOTS["3-4-2-1"] || FORMATION_SLOTS["4-3-3"];
    const squad = teamDetail?.players || [];
    return baseSlots.map((base, idx) => ({
      ...base,
      player: squad[idx % squad.length],
      jerseyNumber: idx + 1,
    }));
  }, [formation, teamDetail]);

  // Update club mutation
  const updateClubMutation = useMutation({
    mutationFn: (data: Partial<Club>) => api.updateClub(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["club"] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  const handleSaveTactics = (e: React.FormEvent) => {
    e.preventDefault();
    updateClubMutation.mutate({
      primary_formation: formation,
      secondary_formation: secondaryFormation,
      playing_style: {
        possession_phase: possessionStyle,
        pressing_intensity: pressingIntensity,
        build_up_approach: buildUpApproach,
      },
    });
  };

  if (loadingClub) {
    return <LoadingSpinner message="Calibrating club tactical identity telemetry..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tactical Identity & Constellation Blueprint"
        subtitle={`System specifications, positional requirements and tactical archetypes for ${
          club?.name || "Active Club"
        }`}
        breadcrumbs={[
          { label: "Overview", href: "/" },
          { label: "Tactical Identity", href: "/tactics" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link
              to="/recruitment"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-[#050A08] text-xs font-mono font-bold rounded transition-colors shadow-sm"
            >
              <span>Build Mission</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        }
      />

      {saveSuccess && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded text-xs text-emerald-300 flex items-center gap-2 font-mono">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          Tactical identity updated. Recruitment discovery algorithms calibrated to these specifications.
        </div>
      )}

      {/* View Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-[#1D3025] pb-2 font-mono text-xs">
        <button
          onClick={() => setActiveTab("cluster")}
          className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
            activeTab === "cluster"
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold"
              : "text-[#87958B] hover:text-[#E8EDE9]"
          }`}
        >
          Role Constellation & Gaps
        </button>
        <button
          onClick={() => setActiveTab("pitch")}
          className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
            activeTab === "pitch"
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold"
              : "text-[#87958B] hover:text-[#E8EDE9]"
          }`}
        >
          Tactical Pitch Architecture
        </button>
        <button
          onClick={() => setActiveTab("system")}
          className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
            activeTab === "system"
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold"
              : "text-[#87958B] hover:text-[#E8EDE9]"
          }`}
        >
          System Configuration & ML Archetypes
        </button>
      </div>

      {/* Tab 1: Tactical Constellation Map matching Video frame_030.png */}
      {activeTab === "cluster" && (
        <div className="space-y-6">
          <div className="relative rounded-xl border border-[#1D3025] bg-gradient-to-b from-[#080F0B] to-[#050A08] p-6 sm:p-10 overflow-hidden min-h-[460px] flex items-center justify-center">
            {/* Ambient Background Grid */}
            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#10B981_1px,transparent_1px)] [background-size:24px_24px]" />

            {/* Constellation Canvas */}
            <div className="relative w-full max-w-4xl h-[420px]">
              {/* Cluster 1: Central Pivot Group (Left/Top) */}
              <div className="absolute left-[10%] top-[15%] p-4 rounded-full border border-purple-500/20 bg-purple-950/10 flex items-center gap-4">
                <div className="text-center">
                  <div className="h-10 w-10 rounded-full bg-purple-500/20 border border-purple-400 flex items-center justify-center text-purple-300 font-bold text-xs mx-auto">
                    {getInitials(p1.name)}
                  </div>
                  <span className="text-[11px] font-mono text-[#E8EDE9] mt-1 block truncate max-w-[70px]">
                    {p1.name.split(" ").slice(-1)[0]}
                  </span>
                </div>
                <div className="text-center">
                  <div className="h-10 w-10 rounded-full bg-purple-500/20 border border-purple-400 flex items-center justify-center text-purple-300 font-bold text-xs mx-auto">
                    {getInitials(p2.name)}
                  </div>
                  <span className="text-[11px] font-mono text-[#E8EDE9] mt-1 block truncate max-w-[70px]">
                    {p2.name.split(" ").slice(-1)[0]}
                  </span>
                </div>
                <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-mono uppercase text-purple-400 whitespace-nowrap">
                  CENTRAL PIVOT
                </span>
              </div>

              {/* Cluster 2: Attacking / Creation Group (Right/Top) */}
              <div className="absolute right-[12%] top-[12%] p-4 rounded-full border border-sky-500/20 bg-sky-950/10 flex items-center gap-4">
                <div className="text-center">
                  <div className="h-10 w-10 rounded-full bg-sky-500/20 border border-sky-400 flex items-center justify-center text-sky-300 font-bold text-xs mx-auto">
                    {getInitials(p3.name)}
                  </div>
                  <span className="text-[11px] font-mono text-[#E8EDE9] mt-1 block truncate max-w-[70px]">
                    {p3.name.split(" ").slice(-1)[0]}
                  </span>
                </div>
                <div className="text-center">
                  <div className="h-10 w-10 rounded-full bg-sky-500/20 border border-sky-400 flex items-center justify-center text-sky-300 font-bold text-xs mx-auto">
                    {getInitials(p4.name)}
                  </div>
                  <span className="text-[11px] font-mono text-[#E8EDE9] mt-1 block truncate max-w-[70px]">
                    {p4.name.split(" ").slice(-1)[0]}
                  </span>
                </div>
                <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-mono uppercase text-sky-400 whitespace-nowrap">
                  CREATIVE ATTACK
                </span>
              </div>

              {/* Cluster 3: Defensive Stability (Left/Bottom) */}
              <div className="absolute left-[18%] bottom-[18%] p-4 rounded-full border border-amber-500/20 bg-amber-950/10 flex items-center gap-3">
                <div className="text-center">
                  <div className="h-10 w-10 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300 font-bold text-xs mx-auto">
                    {getInitials(p5.name)}
                  </div>
                  <span className="text-[11px] font-mono text-[#E8EDE9] mt-1 block truncate max-w-[70px]">
                    {p5.name.split(" ").slice(-1)[0]}
                  </span>
                </div>
                <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-mono uppercase text-amber-400 whitespace-nowrap">
                  DEFENSIVE REINFORCEMENT
                </span>
              </div>

              {/* The Glowing Red Tactical Void / Gap in Center */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                <div className="h-32 w-32 rounded-full border-2 border-dashed border-rose-500 bg-rose-500/10 flex flex-col items-center justify-center text-rose-400 animate-pulse shadow-[0_0_24px_rgba(244,63,94,0.3)] text-center p-2">
                  <span className="text-xs font-black tracking-wider">⚠ RECRUITMENT GAP</span>
                  <span className="text-[10px] font-mono font-bold mt-1 uppercase leading-tight line-clamp-2">
                    {tacticalGap.position}
                  </span>
                </div>
              </div>

              {/* Diagnostic Callout Card matching Video frame_030.png */}
              <div className="absolute right-4 bottom-4 w-80 rounded-xl border border-rose-900/40 bg-[#0D1C15]/95 backdrop-blur-md p-5 space-y-3 shadow-2xl">
                <div className="text-xs font-mono font-bold uppercase text-rose-400 flex items-center gap-1.5">
                  <span>URGENCY: {tacticalGap.urgency.toUpperCase()}</span>
                </div>
                <p className="text-xs font-mono text-[#87958B] leading-relaxed">
                  {tacticalGap.reason}
                </p>
                <Link
                  to="/recruitment"
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded bg-emerald-500 hover:bg-emerald-400 text-[#050A08] font-mono text-xs font-bold uppercase transition-colors shadow-md"
                >
                  <span>BUILD RECRUITMENT MISSION</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Stepper Navigation matching Video */}
          <div className="flex items-center justify-between font-mono text-xs text-[#87958B] pt-2">
            <div>STEP 3 OF 10: TACTICAL ARCHETYPE GAP ANALYSIS</div>
            <Link
              to="/recruitment"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded bg-emerald-500 hover:bg-emerald-400 text-[#050A08] font-bold uppercase tracking-wider transition-colors"
            >
              <span>NEXT: RECRUITMENT MISSION</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Tab 2: Pitch Architecture */}
      {activeTab === "pitch" && (
        <div className="rounded-xl border border-[#1D3025] bg-[#0D1C15] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <SectionHeader
              title="Tactical System Blueprint"
              subtitle={`Formation: ${formation} with primary squad positional slots`}
            />

            <div className="flex items-center gap-2 font-mono text-xs">
              <label className="text-[#87958B]">Formation:</label>
              <select
                value={formation}
                onChange={(e) => setFormationOverride(e.target.value as FormationKey)}
                className="bg-[#080F0B] border border-[#1D3025] text-xs font-mono text-[#E8EDE9] rounded px-3 py-1"
              >
                <option value="3-4-2-1">3-4-2-1 (Alonso System)</option>
                <option value="4-3-3">4-3-3 (Modern Possession)</option>
                <option value="4-2-3-1">4-2-3-1 (Double Pivot)</option>
                <option value="3-5-2">3-5-2 (Wingback Overloads)</option>
              </select>
            </div>
          </div>

          <div className="max-w-xl mx-auto py-4">
            <TacticalPitch formation={formation} slots={pitchSlots} />
          </div>
        </div>
      )}

      {/* Tab 3: System Configuration & ML Archetypes */}
      {activeTab === "system" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Tactical Config Form (6 Cols) */}
          <div className="lg:col-span-6 bg-[#0D1C15] border border-[#1D3025] rounded-xl p-5 space-y-4">
            <SectionHeader
              title="Playing Style Configuration"
              subtitle="Governs candidate evaluation and recruit fit scoring"
            />

            <form onSubmit={handleSaveTactics} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block uppercase text-[#87958B] mb-1">Primary Formation</label>
                <input
                  type="text"
                  value={formation}
                  onChange={(e) => setFormationOverride(e.target.value as FormationKey)}
                  className="w-full bg-[#080F0B] border border-[#1D3025] rounded p-2 text-[#E8EDE9]"
                />
              </div>

              <div>
                <label className="block uppercase text-[#87958B] mb-1">Secondary Formation</label>
                <input
                  type="text"
                  value={secondaryFormation}
                  onChange={(e) => setSecondaryFormationOverride(e.target.value)}
                  className="w-full bg-[#080F0B] border border-[#1D3025] rounded p-2 text-[#E8EDE9]"
                />
              </div>

              <div>
                <label className="block uppercase text-[#87958B] mb-1">Possession Phase Doctrine</label>
                <textarea
                  rows={2}
                  value={possessionStyle}
                  onChange={(e) => setPossessionStyleOverride(e.target.value)}
                  className="w-full bg-[#080F0B] border border-[#1D3025] rounded p-2 text-[#E8EDE9]"
                />
              </div>

              <div>
                <label className="block uppercase text-[#87958B] mb-1">Pressing & Rest Defense</label>
                <textarea
                  rows={2}
                  value={pressingIntensity}
                  onChange={(e) => setPressingIntensityOverride(e.target.value)}
                  className="w-full bg-[#080F0B] border border-[#1D3025] rounded p-2 text-[#E8EDE9]"
                />
              </div>

              <div>
                <label className="block uppercase text-[#87958B] mb-1">Buildup Mechanics</label>
                <textarea
                  rows={2}
                  value={buildUpApproach}
                  onChange={(e) => setBuildUpApproachOverride(e.target.value)}
                  className="w-full bg-[#080F0B] border border-[#1D3025] rounded p-2 text-[#E8EDE9]"
                />
              </div>

              <button
                type="submit"
                disabled={updateClubMutation.isPending}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-[#050A08] font-bold uppercase tracking-wider rounded transition-colors flex items-center justify-center gap-2"
              >
                <Save className="h-4 w-4" />
                {updateClubMutation.isPending ? "Saving..." : "Save Tactical Identity"}
              </button>
            </form>
          </div>

          {/* ML Cluster Library (6 Cols) */}
          <div className="lg:col-span-6 space-y-4">
            <SectionHeader
              title="Discovered Tactical Archetypes"
              subtitle="PCA dimensionality reduction + K-Means clusters"
            />

            <div className="space-y-3 font-mono text-xs">
              {archetypes &&
                archetypes.map((arch) => (
                  <div
                    key={arch.cluster_id}
                    className="p-3.5 bg-[#0D1C15] border border-[#1D3025] rounded-lg space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-400">{arch.label}</span>
                      <span className="text-[10px] px-2 py-0.5 bg-[#080F0B] rounded text-[#87958B]">
                        {arch.percentage_of_pool}% of pool
                      </span>
                    </div>
                    <p className="text-xs text-[#87958B] font-sans">{arch.description}</p>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {arch.leading_kpis.map((kpi, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-1.5 py-0.5 bg-[#080F0B] border border-[#1D3025] rounded text-zinc-300"
                        >
                          {kpi}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
