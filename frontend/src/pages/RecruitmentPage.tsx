import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { PageHeader } from "../components/layout/PageHeader";
import { SectionHeader } from "../components/layout/SectionHeader";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { PositionBadge } from "../components/football/PositionBadge";
import { formatMinutes } from "../lib/utils";
import { ModalDialog } from "../components/common/ModalDialog";
import {
  BookmarkPlus,
  ArrowUpRight,
  Plus,
  BrainCircuit,
  Search,
} from "lucide-react";
import type { CandidateRecommendation } from "../types/football";

export const RecruitmentPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Selection states
  const [selectedRole, setSelectedRole] = useState("Box-to-Box Engine");
  const [selectedPosition, setSelectedPosition] = useState("CM");
  const [selectedAgeRange, setSelectedAgeRange] = useState("18-23");
  const [preferredFoot, setPreferredFoot] = useState<"Right" | "Either" | "Left">("Either");
  const [minFitScore, setMinFitScore] = useState(70);
  const [minMinutes, setMinMinutes] = useState(180);

  // Target Attribute sliders
  const [ballCarrying, setBallCarrying] = useState(80);
  const [progPassing, setProgPassing] = useState(75);
  const [pressing, setPressing] = useState(78);
  const [defActions, setDefActions] = useState(70);
  const [ballRecovery, setBallRecovery] = useState(72);
  const [stamina, setStamina] = useState(85);

  // Modals
  const [showAddNeedModal, setShowAddNeedModal] = useState(false);
  const [showShortlistModal, setShowShortlistModal] = useState(false);
  const [showSimilarModal, setShowSimilarModal] = useState(false);
  const [candidateForAction, setCandidateForAction] = useState<CandidateRecommendation | null>(null);

  // Form states for new need
  const [needTitle, setNeedTitle] = useState("");
  const [needPosition, setNeedPosition] = useState("Midfielder");
  const [needRole, setNeedRole] = useState("Box-to-Box Engine");
  const [needPriority, setNeedPriority] = useState<"Critical" | "High" | "Medium" | "Low">("High");
  const [needRationale, setNeedRationale] = useState("");

  // Shortlist form states
  const [selectedShortlistId, setSelectedShortlistId] = useState("");
  const [shortlistNotes, setShortlistNotes] = useState("");

  // Similar players ML data
  const [similarTargetId, setSimilarTargetId] = useState<string | null>(null);

  // Queries
  const { data: rolesData } = useQuery({
    queryKey: ["supportedRoles"],
    queryFn: api.getSupportedRoles,
  });

  const { data: recruitmentNeeds } = useQuery({
    queryKey: ["recruitmentNeeds"],
    queryFn: api.getRecruitmentNeeds,
  });

  // Note: Age filtering is disabled because birth_date is not provided in the StatsBomb open dataset

  // Map short position codes to canonical groups
  const positionGroupMap: Record<string, string> = {
    GK: "Goalkeeper",
    CB: "Defender",
    LB: "Defender",
    RB: "Defender",
    WB: "Defender",
    LWB: "Defender",
    RWB: "Defender",
    DM: "Midfielder",
    CM: "Midfielder",
    AM: "Midfielder",
    LM: "Midfielder",
    RM: "Midfielder",
    LW: "Winger",
    RW: "Winger",
    ST: "Forward",
    CF: "Forward",
    SS: "Forward",
  };
  const mappedPosition =
    selectedPosition && selectedPosition !== "Any"
      ? positionGroupMap[selectedPosition] || selectedPosition
      : undefined;

  const mappedFoot =
    preferredFoot && preferredFoot !== "Either" ? preferredFoot : undefined;

  const {
    data: candidates,
    isLoading: loadingCandidates,
    error: candidatesError,
  } = useQuery({
    queryKey: [
      "recruitmentCandidates",
      selectedRole,
      minMinutes,
      minFitScore,
      mappedPosition,
      mappedFoot,
      selectedAgeRange,
    ],
    queryFn: () =>
      api.discoverCandidates({
        role_profile: selectedRole,
        min_minutes: minMinutes,
        min_fit_score: minFitScore,
        position: mappedPosition,
        preferred_foot: mappedFoot,
        // Age filter omitted — birth_date not available in StatsBomb open data
        limit: 30,
      }),
  });

  const { data: shortlists } = useQuery({
    queryKey: ["shortlists"],
    queryFn: api.getShortlists,
  });

  const { data: similarPlayers, isLoading: loadingSimilar } = useQuery({
    queryKey: ["similarPlayers", similarTargetId],
    queryFn: () => (similarTargetId ? api.getSimilarPlayers(similarTargetId, 5) : Promise.resolve([])),
    enabled: !!similarTargetId,
  });

  // Mutations
  const createNeedMutation = useMutation({
    mutationFn: api.createRecruitmentNeed,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitmentNeeds"] });
      setShowAddNeedModal(false);
      setNeedTitle("");
      setNeedRationale("");
    },
  });

  const handleCreateNeedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createNeedMutation.mutate({
      title: needTitle,
      position: needPosition,
      role_profile: needRole,
      priority: needPriority,
      rationale: needRationale,
      status: "Active",
      target_metrics: {},
    });
  };

  const handleAddToShortlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateForAction || !selectedShortlistId) return;
    try {
      await api.addPlayerToShortlist(selectedShortlistId, {
        player_id: candidateForAction.id,
        notes: shortlistNotes || `Identified for role: ${selectedRole} (Fit: ${candidateForAction.fit_score}/100)`,
        recruitment_status: "Target",
      });
      setShowShortlistModal(false);
      setShortlistNotes("");
    } catch (err) {
      console.error(err);
    }
  };

  const openSimilarModal = (cand: CandidateRecommendation) => {
    setCandidateForAction(cand);
    setSimilarTargetId(cand.id);
    setShowSimilarModal(true);
  };

  const handleLaunchSearch = () => {
    navigate(`/scouting?role=${encodeURIComponent(selectedRole)}&minFit=${minFitScore}`);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Recruitment Intelligence & Squad Missions"
        subtitle="Objective-driven player discovery, tactical fit scoring, and candidate pipeline"
        breadcrumbs={[
          { label: "Overview", href: "/" },
          { label: "Recruitment Missions", href: "/recruitment" },
        ]}
        actions={
          <button
            onClick={() => setShowAddNeedModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-[#050A08] text-xs font-mono font-bold rounded transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Define Recruitment Need
          </button>
        }
      />

      {/* Hero Mission Builder matching Video frame_045.png */}
      <div className="rounded-xl border border-[#1D3025] bg-gradient-to-b from-[#080F0B] to-[#050A08] p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="space-y-1">
          <div className="text-xs font-mono font-bold tracking-widest uppercase text-emerald-400">
            NEW RECRUITMENT MISSION
          </div>
          <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-[#E8EDE9]">
            FIND A {selectedRole.toUpperCase()}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4 border-t border-[#1D3025]">
          {/* Left Column: Profile Controls */}
          <div className="lg:col-span-5 space-y-5 font-mono text-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#E8EDE9]">
              PROFILE
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase text-[#87958B] block mb-1">Position</label>
                <select
                  value={selectedPosition}
                  onChange={(e) => setSelectedPosition(e.target.value)}
                  className="w-full bg-[#080F0B] border border-[#1D3025] rounded p-2 text-[#E8EDE9] font-mono focus:border-emerald-500 outline-none"
                >
                  <option value="">Any Position</option>
                  <option value="GK">GK (Goalkeeper)</option>
                  <option value="CB">CB (Center Back)</option>
                  <option value="LB">LB / RB (Fullback)</option>
                  <option value="WB">LWB / RWB (Wingback)</option>
                  <option value="DM">DM (Defensive Midfield)</option>
                  <option value="CM">CM (Central Midfield)</option>
                  <option value="AM">AM (Attacking Midfield)</option>
                  <option value="LM">LM / RM (Wide Midfield)</option>
                  <option value="LW">LW / RW (Winger)</option>
                  <option value="CF">CF / ST (Center Forward)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase text-[#87958B] block mb-1">
                  Age Bracket
                  <span className="ml-1 text-yellow-600" title="Birth date data not available in StatsBomb open dataset — age filter is not applied">⚠</span>
                </label>
                <select
                  value={selectedAgeRange}
                  onChange={(e) => setSelectedAgeRange(e.target.value)}
                  disabled
                  className="w-full bg-[#080F0B] border border-[#1D3025] rounded p-2 text-[#4a5568] font-mono outline-none cursor-not-allowed opacity-50"
                  title="Age filtering unavailable — birth dates not present in StatsBomb open data"
                >
                  <option value="18-23">18-23 (Young Prospect)</option>
                  <option value="21-25">21-25 (Emerging Talent)</option>
                  <option value="24-28">24-28 (Peak Prime)</option>
                  <option value="27-32">27-32 (Experienced)</option>
                </select>
                <p className="text-[9px] text-yellow-600/70 mt-0.5">Age data unavailable in open dataset</p>
              </div>
            </div>

            {/* Preferred Foot Pills matching Video */}
            <div>
              <label className="text-[10px] uppercase text-[#87958B] block mb-2">Preferred Foot</label>
              <div className="flex items-center gap-2">
                {(["Right", "Either", "Left"] as const).map((foot) => (
                  <button
                    key={foot}
                    type="button"
                    onClick={() => setPreferredFoot(foot)}
                    className={`px-3 py-1.5 rounded text-xs transition-colors cursor-pointer ${
                      preferredFoot === foot
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500 font-bold"
                        : "bg-[#080F0B] text-[#87958B] border border-[#1D3025] hover:text-[#E8EDE9]"
                    }`}
                  >
                    {foot}
                  </button>
                ))}
              </div>
            </div>

            {/* Minimum Fit Slider matching Video */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#87958B] uppercase">MINIMUM FIT</span>
                <span className="font-bold text-emerald-400 tabular-nums">{minFitScore}%</span>
              </div>
              <input
                type="range"
                min="40"
                max="95"
                value={minFitScore}
                onChange={(e) => setMinFitScore(Number(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Right Column: Target Attributes Sliders matching Video frame_045.png */}
          <div className="lg:col-span-7 space-y-4 font-mono text-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#E8EDE9]">
              TARGET ATTRIBUTES
            </div>

            <div className="space-y-3">
              {/* Ball Carrying */}
              <div className="flex items-center justify-between gap-4">
                <span className="w-44 text-[#87958B] uppercase">BALL CARRYING</span>
                <input
                  type="range"
                  min="50"
                  max="99"
                  value={ballCarrying}
                  onChange={(e) => setBallCarrying(Number(e.target.value))}
                  className="flex-1 accent-emerald-400 cursor-pointer"
                />
                <span className="w-8 text-right font-bold text-[#E8EDE9] tabular-nums">{ballCarrying}</span>
              </div>

              {/* Progressive Passing */}
              <div className="flex items-center justify-between gap-4">
                <span className="w-44 text-[#87958B] uppercase">PROGRESSIVE PASSING</span>
                <input
                  type="range"
                  min="50"
                  max="99"
                  value={progPassing}
                  onChange={(e) => setProgPassing(Number(e.target.value))}
                  className="flex-1 accent-emerald-400 cursor-pointer"
                />
                <span className="w-8 text-right font-bold text-[#E8EDE9] tabular-nums">{progPassing}</span>
              </div>

              {/* Pressing */}
              <div className="flex items-center justify-between gap-4">
                <span className="w-44 text-[#87958B] uppercase">PRESSING</span>
                <input
                  type="range"
                  min="50"
                  max="99"
                  value={pressing}
                  onChange={(e) => setPressing(Number(e.target.value))}
                  className="flex-1 accent-emerald-400 cursor-pointer"
                />
                <span className="w-8 text-right font-bold text-[#E8EDE9] tabular-nums">{pressing}</span>
              </div>

              {/* Defensive Actions */}
              <div className="flex items-center justify-between gap-4">
                <span className="w-44 text-[#87958B] uppercase">DEFENSIVE ACTIONS</span>
                <input
                  type="range"
                  min="50"
                  max="99"
                  value={defActions}
                  onChange={(e) => setDefActions(Number(e.target.value))}
                  className="flex-1 accent-emerald-400 cursor-pointer"
                />
                <span className="w-8 text-right font-bold text-[#E8EDE9] tabular-nums">{defActions}</span>
              </div>

              {/* Ball Recovery */}
              <div className="flex items-center justify-between gap-4">
                <span className="w-44 text-[#87958B] uppercase">BALL RECOVERY</span>
                <input
                  type="range"
                  min="50"
                  max="99"
                  value={ballRecovery}
                  onChange={(e) => setBallRecovery(Number(e.target.value))}
                  className="flex-1 accent-emerald-400 cursor-pointer"
                />
                <span className="w-8 text-right font-bold text-[#E8EDE9] tabular-nums">{ballRecovery}</span>
              </div>

              {/* Stamina */}
              <div className="flex items-center justify-between gap-4">
                <span className="w-44 text-[#87958B] uppercase">STAMINA</span>
                <input
                  type="range"
                  min="50"
                  max="99"
                  value={stamina}
                  onChange={(e) => setStamina(Number(e.target.value))}
                  className="flex-1 accent-emerald-400 cursor-pointer"
                />
                <span className="w-8 text-right font-bold text-[#E8EDE9] tabular-nums">{stamina}</span>
              </div>
            </div>

            {/* Launch Search Button matching Video */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleLaunchSearch}
                className="inline-flex items-center gap-2 px-6 py-3 rounded bg-emerald-500 hover:bg-emerald-400 text-[#050A08] font-mono text-xs font-black uppercase tracking-wider transition-colors shadow-lg"
              >
                <Search className="h-4 w-4" />
                <span>LAUNCH SCOUTING SEARCH</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Active Squad Recruitment Needs Section */}
      <div className="space-y-3">
        <SectionHeader
          title="Active Squad Recruitment Needs"
          subtitle="Mandated positional requirements derived from squad gap analysis"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recruitmentNeeds && recruitmentNeeds.length > 0 ? (
            recruitmentNeeds.map((need) => (
              <div
                key={need.id}
                onClick={() => setSelectedRole(need.role_profile)}
                className={`cursor-pointer p-4 rounded-lg border transition-all ${
                  selectedRole === need.role_profile
                    ? "bg-[#12251B] border-emerald-500 shadow-md ring-1 ring-emerald-500/50"
                    : "bg-[#0D1C15] border-[#1D3025] hover:border-emerald-500/40"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                      need.priority === "Critical"
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        : need.priority === "High"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    }`}
                  >
                    {need.priority}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400">
                    {need.status}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-[#E8EDE9] line-clamp-1">{need.title}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <PositionBadge position={need.position} />
                  <span className="text-xs text-[#87958B] font-mono">{need.role_profile}</span>
                </div>
                <p className="text-xs text-[#87958B] mt-2 line-clamp-2">{need.rationale}</p>
              </div>
            ))
          ) : (
            <div className="col-span-3 bg-[#0D1C15] border border-[#1D3025] p-6 text-center text-xs text-[#87958B] rounded">
              No active recruitment needs configured.
            </div>
          )}
        </div>
      </div>

      {/* Discovery Candidate Results Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionHeader
            title={`Discovered Candidates: ${selectedRole}`}
            subtitle={`Statistical matches evaluated against ${selectedRole} percentile weights`}
          />
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-[#87958B]">Min Minutes:</span>
            <select
              value={minMinutes}
              onChange={(e) => setMinMinutes(Number(e.target.value))}
              className="bg-[#080F0B] border border-[#1D3025] text-xs text-[#E8EDE9] rounded px-2.5 py-1"
            >
              <option value={90}>90+ mins</option>
              <option value={180}>180+ mins</option>
              <option value={360}>360+ mins</option>
            </select>
          </div>
        </div>

        {loadingCandidates ? (
          <LoadingSpinner message="Calculating tactical percentile scores across players..." />
        ) : candidatesError ? (
          <ErrorMessage message={(candidatesError as Error).message} />
        ) : candidates && candidates.length > 0 ? (
          <div className="bg-[#0D1C15] border border-[#1D3025] rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono text-[#E8EDE9]">
                <thead className="bg-[#080F0B] border-b border-[#1D3025] text-[10px] uppercase text-[#87958B]">
                  <tr>
                    <th className="px-4 py-3">Fit Score</th>
                    <th className="px-4 py-3">Player</th>
                    <th className="px-4 py-3">Position</th>
                    <th className="px-4 py-3 text-right">Age</th>
                    <th className="px-4 py-3 text-right">Minutes</th>
                    <th className="px-4 py-3">Key Empirical Strengths</th>
                    <th className="px-4 py-3 text-right">Recruitment Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1D3025]">
                  {candidates.map((cand) => (
                    <tr key={cand.id} className="hover:bg-[#12251B]/50 transition-colors">
                      <td className="px-4 py-3">
                        <span
                          className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                            cand.fit_score >= 80
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : cand.fit_score >= 60
                              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                              : "bg-zinc-800 text-zinc-300"
                          }`}
                        >
                          {cand.fit_score}%
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold">
                        <Link
                          to={`/players/${cand.id}`}
                          className="hover:text-emerald-400 transition-colors"
                        >
                          {cand.name}
                        </Link>
                        <div className="text-[10px] text-[#87958B] font-normal">{cand.nationality || "—"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <PositionBadge position={cand.primary_position} />
                      </td>
                      <td className="px-4 py-3 text-right text-[#87958B]">
                        {cand.age || "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-[#E8EDE9] tabular-nums whitespace-nowrap">
                        {formatMinutes(cand.total_minutes)}
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <ul className="space-y-0.5 text-[#87958B]">
                          {cand.strengths.slice(0, 2).map((s, idx) => (
                            <li key={idx} className="flex items-center gap-1">
                              <span className="text-emerald-400">✔</span>
                              <span className="truncate">{s}</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openSimilarModal(cand)}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-[#080F0B] hover:bg-[#12251B] border border-[#1D3025] text-[10px] text-cyan-400 rounded transition-colors"
                            title="Find statistically similar players (k-NN)"
                          >
                            <BrainCircuit className="h-3 w-3" />
                            Similar
                          </button>
                          <button
                            onClick={() => {
                              setCandidateForAction(cand);
                              setShowShortlistModal(true);
                            }}
                            className="p-1 hover:text-emerald-400 transition-colors"
                            title="Add to Shortlist"
                          >
                            <BookmarkPlus className="h-4 w-4" />
                          </button>
                          <Link
                            to={`/players/${cand.id}`}
                            className="p-1 hover:text-emerald-400 transition-colors"
                            title="View Full Dossier"
                          >
                            <ArrowUpRight className="h-4 w-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-[#0D1C15] border border-[#1D3025] p-8 text-center text-xs font-mono text-[#87958B] rounded">
            No candidates matched the current filter criteria.
          </div>
        )}
      </div>

      {/* Define Recruitment Need Modal */}
      {showAddNeedModal && (
        <ModalDialog
          isOpen={showAddNeedModal}
          onClose={() => setShowAddNeedModal(false)}
          title="Define Squad Recruitment Need"
        >
          <form onSubmit={handleCreateNeedSubmit} className="space-y-4 font-mono text-xs">
            <div>
              <label className="block uppercase text-[#87958B] mb-1">Target Title</label>
              <input
                type="text"
                required
                value={needTitle}
                onChange={(e) => setNeedTitle(e.target.value)}
                placeholder="e.g. Dynamic Box-to-Box Midfielder"
                className="w-full bg-[#080F0B] border border-[#1D3025] rounded p-2 text-[#E8EDE9]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block uppercase text-[#87958B] mb-1">Position Zone</label>
                <select
                  value={needPosition}
                  onChange={(e) => setNeedPosition(e.target.value)}
                  className="w-full bg-[#080F0B] border border-[#1D3025] rounded p-2 text-[#E8EDE9]"
                >
                  <option value="Defender">Defender</option>
                  <option value="Midfielder">Midfielder</option>
                  <option value="Forward">Forward</option>
                  <option value="Goalkeeper">Goalkeeper</option>
                </select>
              </div>

              <div>
                <label className="block uppercase text-[#87958B] mb-1">Target Role</label>
                <select
                  value={needRole}
                  onChange={(e) => setNeedRole(e.target.value)}
                  className="w-full bg-[#080F0B] border border-[#1D3025] rounded p-2 text-[#E8EDE9]"
                >
                  {rolesData &&
                    Object.keys(rolesData).map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block uppercase text-[#87958B] mb-1">Priority</label>
              <select
                value={needPriority}
                onChange={(e) =>
                  setNeedPriority(e.target.value as "Critical" | "High" | "Medium" | "Low")
                }
                className="w-full bg-[#080F0B] border border-[#1D3025] rounded p-2 text-[#E8EDE9]"
              >
                <option value="Critical">Critical (Immediate Gap)</option>
                <option value="High">High (Key Tactical Target)</option>
                <option value="Medium">Medium (Rotational Coverage)</option>
                <option value="Low">Low (Developmental)</option>
              </select>
            </div>

            <div>
              <label className="block uppercase text-[#87958B] mb-1">Tactical Rationale</label>
              <textarea
                rows={3}
                required
                value={needRationale}
                onChange={(e) => setNeedRationale(e.target.value)}
                placeholder="Tactical justification..."
                className="w-full bg-[#080F0B] border border-[#1D3025] rounded p-2 text-[#E8EDE9]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddNeedModal(false)}
                className="px-3 py-1.5 text-[#87958B] hover:text-[#E8EDE9]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createNeedMutation.isPending}
                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-[#050A08] font-bold rounded"
              >
                {createNeedMutation.isPending ? "Creating..." : "Save Need"}
              </button>
            </div>
          </form>
        </ModalDialog>
      )}

      {/* Add To Shortlist Modal */}
      {showShortlistModal && candidateForAction && (
        <ModalDialog
          isOpen={showShortlistModal}
          onClose={() => setShowShortlistModal(false)}
          title={`Add ${candidateForAction.name} to Shortlist`}
        >
          <form onSubmit={handleAddToShortlistSubmit} className="space-y-4 font-mono text-xs">
            <div>
              <label className="block uppercase text-[#87958B] mb-1">Target Shortlist</label>
              <select
                value={selectedShortlistId}
                onChange={(e) => setSelectedShortlistId(e.target.value)}
                required
                className="w-full bg-[#080F0B] border border-[#1D3025] rounded p-2 text-[#E8EDE9]"
              >
                <option value="">-- Select Shortlist --</option>
                {shortlists?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.player_count} players)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block uppercase text-[#87958B] mb-1">Recruitment Notes</label>
              <textarea
                value={shortlistNotes}
                onChange={(e) => setShortlistNotes(e.target.value)}
                rows={3}
                placeholder={`Scouted for role: ${selectedRole}...`}
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

      {/* ML Similar Players Modal */}
      {showSimilarModal && candidateForAction && (
        <ModalDialog
          isOpen={showSimilarModal}
          onClose={() => setShowSimilarModal(false)}
          title={`Comparable Profiles: Similar to ${candidateForAction.name}`}
        >
          <div className="space-y-4 font-mono text-xs">
            <p className="text-[#87958B]">
              Calculated via scikit-learn k-Nearest Neighbors on normalized per-90 event features across 1. Bundesliga 2023/24.
            </p>

            {loadingSimilar ? (
              <LoadingSpinner message="Querying vector similarity space..." />
            ) : similarPlayers && similarPlayers.length > 0 ? (
              <div className="space-y-2">
                {similarPlayers.map((sim) => (
                  <div
                    key={sim.player_id}
                    className="p-3 bg-[#080F0B] border border-[#1D3025] rounded flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/players/${sim.player_id}`}
                          className="font-bold hover:text-emerald-400"
                        >
                          {sim.player_name}
                        </Link>
                        <PositionBadge position={sim.primary_position} />
                        <span className="text-[11px] text-[#87958B]">{sim.nationality}</span>
                      </div>
                      <div className="text-[10px] text-[#87958B] mt-1">
                        {sim.shared_traits.slice(0, 2).join(" • ")}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-emerald-400">
                        {sim.similarity_score}%
                      </span>
                      <div className="text-[10px] text-[#87958B]">Cosine Match</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[#87958B] text-center py-4">
                No sufficient sample players in vector space for this position.
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowSimilarModal(false)}
                className="px-3 py-1.5 bg-[#12251B] border border-[#1D3025] text-[#E8EDE9] rounded"
              >
                Close
              </button>
            </div>
          </div>
        </ModalDialog>
      )}
    </div>
  );
};
