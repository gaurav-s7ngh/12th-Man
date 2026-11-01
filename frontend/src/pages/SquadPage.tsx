import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import { PageHeader } from "../components/layout/PageHeader";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { PositionBadge } from "../components/football/PositionBadge";
import { TacticalPitch } from "../components/football/TacticalPitch";
import {
  FORMATION_SLOTS,
  type FormationKey,
  type PitchPositionSlot,
} from "../components/football/formationSlots";
import { ArrowUpRight, BookmarkPlus, ArrowRight } from "lucide-react";
import { ModalDialog } from "../components/common/ModalDialog";
import type { SquadPlayerProfile } from "../types/football";

export const SquadPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"room" | "depth" | "roster">("room");
  const [formationOverride, setFormationOverride] = useState<FormationKey | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<SquadPlayerProfile | null>(null);
  const [showShortlistModal, setShowShortlistModal] = useState(false);
  const [shortlistTargetId, setShortlistTargetId] = useState("");
  const [shortlistNotes, setShortlistNotes] = useState("");

  // Load Club configuration
  const { data: club } = useQuery({
    queryKey: ["club"],
    queryFn: () => api.getClub(),
  });

  const formation: FormationKey =
    formationOverride ||
    (club?.primary_formation && FORMATION_SLOTS[club.primary_formation as FormationKey]
      ? (club.primary_formation as FormationKey)
      : "3-4-2-1");

  // Load Squad Assessment
  const { data: assessment, isLoading: loadingAssessment, error: assessmentError } = useQuery({
    queryKey: ["squadAssessment"],
    queryFn: api.getSquadAssessment,
  });

  // Load shortlists for quick candidate add
  const { data: shortlists } = useQuery({
    queryKey: ["shortlists"],
    queryFn: api.getShortlists,
  });

  // Load linked team details for tactical pitch roster
  const { data: teamDetail } = useQuery({
    queryKey: ["teamDetail", club?.linked_team_id],
    queryFn: () => (club?.linked_team_id ? api.getTeam(club.linked_team_id) : Promise.resolve(null)),
    enabled: !!club?.linked_team_id,
  });

  // Construct pitch position slots
  const pitchSlots: PitchPositionSlot[] = useMemo(() => {
    const baseSlots = FORMATION_SLOTS[formation] || FORMATION_SLOTS["3-4-2-1"] || FORMATION_SLOTS["4-3-3"];
    const squad = teamDetail?.players || [];
    return baseSlots.map((base, idx) => ({
      ...base,
      player: squad[idx % squad.length],
      jerseyNumber: idx + 1,
    }));
  }, [formation, teamDetail]);

  const handleShortlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayer || !shortlistTargetId) return;
    try {
      await api.addPlayerToShortlist(shortlistTargetId, {
        player_id: selectedPlayer.id,
        notes: shortlistNotes || "Added from squad management analysis",
        recruitment_status: "Target",
      });
      setShowShortlistModal(false);
      setShortlistNotes("");
    } catch (err) {
      console.error(err);
    }
  };

  if (loadingAssessment) {
    return <LoadingSpinner message="Calculating squad positional depth and tactical health..." />;
  }

  if (assessmentError) {
    return <ErrorMessage message={(assessmentError as Error).message} />;
  }

  const allSquadPlayers = assessment?.depth_categories.flatMap((c) => c.players) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Squad Room & Positional Depth"
        subtitle={`Tactical squad composition and rotation coverage for ${club?.name || "Bayer 04 Leverkusen"}`}
        breadcrumbs={[
          { label: "Overview", href: "/" },
          { label: "Squad Room", href: "/squad" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link
              to="/recruitment"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-[#050A08] text-xs font-mono font-bold rounded transition-colors shadow-sm"
            >
              <ArrowRight className="h-4 w-4" />
              Build Recruitment Mission
            </Link>
          </div>
        }
      />

      {/* View Switcher Tabs matching Video */}
      <div className="flex items-center gap-2 border-b border-[#1D3025] pb-2 font-mono text-xs">
        <button
          onClick={() => setActiveTab("room")}
          className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
            activeTab === "room"
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold"
              : "text-[#87958B] hover:text-[#E8EDE9]"
          }`}
        >
          Tactical Pitch & Coverage
        </button>
        <button
          onClick={() => setActiveTab("depth")}
          className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
            activeTab === "depth"
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold"
              : "text-[#87958B] hover:text-[#E8EDE9]"
          }`}
        >
          Positional Depth Matrix
        </button>
        <button
          onClick={() => setActiveTab("roster")}
          className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
            activeTab === "roster"
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold"
              : "text-[#87958B] hover:text-[#E8EDE9]"
          }`}
        >
          Full Roster Telemetry Table
        </button>
      </div>

      {/* Tab 1: SQUAD ROOM matching Video f_020.png */}
      {activeTab === "room" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left / Center: Pitch with players and highlighted gap */}
          <div className="lg:col-span-7 rounded-xl border border-[#1D3025] bg-[#080F0B] p-4 sm:p-6 shadow-2xl">
            <div className="max-w-xl mx-auto">
              <TacticalPitch formation={formation} slots={pitchSlots} />
            </div>
          </div>

          {/* Right: SQUAD ROOM Diagnostics & Profile Coverage */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-xl border border-[#1D3025] bg-[#0D1C15] p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black uppercase tracking-tight text-[#E8EDE9]">
                  SQUAD ROOM
                </h2>

                {/* Formation Pills matching Video */}
                <div className="flex items-center gap-1.5 font-mono text-xs">
                  {(["3-4-2-1", "4-3-3", "4-2-3-1"] as FormationKey[]).map((fKey) => (
                    <button
                      key={fKey}
                      onClick={() => setFormationOverride(fKey)}
                      className={`px-2.5 py-1 rounded transition-colors ${
                        formation === fKey
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500 font-bold"
                          : "bg-[#080F0B] text-[#87958B] border border-[#1D3025] hover:text-[#E8EDE9]"
                      }`}
                    >
                      {fKey}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tactical summary text */}
              <p className="text-xs font-mono text-[#87958B] leading-relaxed">
                {formation === "3-4-2-1"
                  ? "Two central midfielders must cover huge channels behind the wing-backs. Without a true box-to-box engine, defensive transitions are exposed."
                  : "The central midfield structure requires continuous pressing transitions and box-to-box ball recoveries."}
              </p>

              {/* Profile Coverage Meters matching Video f_020.png */}
              <div className="space-y-4 pt-2 border-t border-[#1D3025]">
                <div className="text-xs font-mono font-bold uppercase text-[#E8EDE9] tracking-wider">
                  PROFILE COVERAGE
                </div>

                {/* Creative */}
                <div className="space-y-1 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#E8EDE9]">Creative Creator</span>
                    <span className="text-emerald-400 font-bold">88%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#080F0B] overflow-hidden border border-[#1D3025]">
                    <div className="h-full bg-emerald-400 rounded-full" style={{ width: "88%" }} />
                  </div>
                </div>

                {/* Deep Play */}
                <div className="space-y-1 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#E8EDE9]">Deep Playmaker</span>
                    <span className="text-emerald-400 font-bold">74%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#080F0B] overflow-hidden border border-[#1D3025]">
                    <div className="h-full bg-emerald-400 rounded-full" style={{ width: "74%" }} />
                  </div>
                </div>

                {/* Ball Winning */}
                <div className="space-y-1 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#E8EDE9]">Ball Winning Destroyer</span>
                    <span className="text-emerald-400 font-bold">84%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#080F0B] overflow-hidden border border-[#1D3025]">
                    <div className="h-full bg-emerald-400 rounded-full" style={{ width: "84%" }} />
                  </div>
                </div>

                {/* Box-to-Box · SQUAD WEAKNESS */}
                <div className="space-y-1 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-rose-400 font-bold">Box-to-Box · SQUAD WEAKNESS</span>
                    <span className="text-rose-400 font-bold">31%</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-[#080F0B] overflow-hidden border border-rose-900/50">
                    <div className="h-full bg-rose-500 rounded-full animate-pulse" style={{ width: "31%" }} />
                  </div>
                </div>
              </div>

              {/* Action Link to Recruitment */}
              <div className="pt-2">
                <Link
                  to="/recruitment"
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded bg-emerald-500 hover:bg-emerald-400 text-[#050A08] font-mono text-xs font-bold uppercase transition-colors"
                >
                  <span>BUILD RECRUITMENT MISSION</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Positional Depth Matrix */}
      {activeTab === "depth" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assessment?.depth_categories.map((cat) => (
              <div
                key={cat.category}
                className="bg-[#0D1C15] border border-[#1D3025] hover:border-emerald-500/40 rounded-lg p-4 flex flex-col justify-between space-y-3 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-[#E8EDE9]">{cat.category}</h3>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                        cat.status === "Critical Void"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          : cat.status === "Thin"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      }`}
                    >
                      {cat.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono text-[#87958B] mt-1 border-b border-[#1D3025] pb-2">
                    <span>
                      Registered: <strong className="text-[#E8EDE9]">{cat.current_count}</strong> / Target: {cat.target_slots}
                    </span>
                    <span>Ratio: {Math.round((cat.current_count / cat.target_slots) * 100)}%</span>
                  </div>

                  {/* Players in this category */}
                  <div className="space-y-2 mt-3">
                    {cat.players.slice(0, 4).map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2 bg-[#080F0B] border border-[#1D3025] rounded text-xs font-mono"
                      >
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/players/${p.id}`}
                            className="font-bold hover:text-emerald-400 transition-colors text-[#E8EDE9]"
                          >
                            {p.name}
                          </Link>
                          <span className="text-[10px] text-[#87958B]">{p.age ? `${p.age}y` : ""}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-[#87958B]">
                          <span>{p.total_minutes}m</span>
                          <span className="text-emerald-400">{p.starts} starts</span>
                        </div>
                      </div>
                    ))}
                    {cat.players.length === 0 && (
                      <div className="text-xs text-rose-400 py-3 text-center font-mono">
                        No specialists registered. Immediate external recruit needed.
                      </div>
                    )}
                  </div>
                </div>

                {cat.status !== "Adequate" && (
                  <div className="pt-2 border-t border-[#1D3025]">
                    <Link
                      to="/recruitment"
                      className="text-xs font-mono text-emerald-400 hover:text-emerald-300 flex items-center justify-center gap-1 font-semibold"
                    >
                      Create Recruitment Need <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Full Squad Roster Table */}
      {activeTab === "roster" && (
        <div className="bg-[#0D1C15] border border-[#1D3025] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono text-[#E8EDE9]">
              <thead className="bg-[#080F0B] border-b border-[#1D3025] text-[10px] uppercase text-[#87958B]">
                <tr>
                  <th className="px-4 py-3">Player</th>
                  <th className="px-4 py-3">Position</th>
                  <th className="px-4 py-3 text-right">Age</th>
                  <th className="px-4 py-3 text-right">Starts</th>
                  <th className="px-4 py-3 text-right">Minutes</th>
                  <th className="px-4 py-3 text-right">Goals</th>
                  <th className="px-4 py-3 text-right">Assists</th>
                  <th className="px-4 py-3 text-right">xG</th>
                  <th className="px-4 py-3 text-right">Confidence</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1D3025]">
                {allSquadPlayers.map((player) => (
                  <tr key={player.id} className="hover:bg-[#12251B]/50 transition-colors">
                    <td className="px-4 py-3 font-bold">
                      <Link
                        to={`/players/${player.id}`}
                        className="hover:text-emerald-400 transition-colors"
                      >
                        {player.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <PositionBadge position={player.primary_position} />
                    </td>
                    <td className="px-4 py-3 text-right text-[#87958B]">
                      {player.age || "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-[#87958B]">
                      {player.starts}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-[#E8EDE9]">
                      {player.total_minutes}m
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-400 font-bold">
                      {player.goals}
                    </td>
                    <td className="px-4 py-3 text-right text-cyan-400">
                      {player.assists}
                    </td>
                    <td className="px-4 py-3 text-right text-[#87958B]">
                      {player.xg}
                    </td>
                    <td className="px-4 py-3 text-right text-[10px]">
                      <span
                        className={`px-2 py-0.5 rounded ${
                          player.sample_confidence.includes("Sufficient")
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-amber-500/10 text-amber-400"
                        }`}
                      >
                        {player.sample_confidence.split(" ")[0]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedPlayer(player);
                            setShowShortlistModal(true);
                          }}
                          className="p-1 hover:text-emerald-400 transition-colors"
                          title="Add to Shortlist"
                        >
                          <BookmarkPlus className="h-3.5 w-3.5" />
                        </button>
                        <Link
                          to={`/players/${player.id}`}
                          className="p-1 hover:text-emerald-400 transition-colors"
                          title="View Dossier"
                        >
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Shortlist Modal */}
      {showShortlistModal && selectedPlayer && (
        <ModalDialog
          isOpen={showShortlistModal}
          onClose={() => setShowShortlistModal(false)}
          title={`Add ${selectedPlayer.name} to Shortlist`}
        >
          <form onSubmit={handleShortlistSubmit} className="space-y-4 font-mono text-xs">
            <div>
              <label className="block text-[#87958B] uppercase mb-1">Select Shortlist</label>
              <select
                value={shortlistTargetId}
                onChange={(e) => setShortlistTargetId(e.target.value)}
                required
                className="w-full bg-[#080F0B] border border-[#1D3025] rounded p-2 text-[#E8EDE9]"
              >
                <option value="">-- Choose Target Shortlist --</option>
                {shortlists?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.player_count} players)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[#87958B] uppercase mb-1">Scout Notes</label>
              <textarea
                value={shortlistNotes}
                onChange={(e) => setShortlistNotes(e.target.value)}
                rows={3}
                placeholder="Tactical fit and suitability notes..."
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
