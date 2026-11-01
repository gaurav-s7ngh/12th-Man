import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { PageHeader } from "../components/layout/PageHeader";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { ModalDialog } from "../components/common/ModalDialog";
import {
  Plus,
  ArrowRight,
  Eye,
  Clock,
  BookmarkCheck,
  Flag,
  FileCheck,
  User,
} from "lucide-react";
import type { ShortlistCreate } from "../types/scouting";

interface KanbanStage {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const KANBAN_STAGES: KanbanStage[] = [
  { id: "Watchlist", label: "WATCHLIST", icon: Eye },
  { id: "Shortlisted", label: "SHORTLIST", icon: Clock },
  { id: "Scout Review", label: "SCOUT REVIEW", icon: BookmarkCheck },
  { id: "Follow-up", label: "FOLLOW-UP", icon: Flag },
  { id: "Final Decision", label: "FINAL DECISION", icon: FileCheck },
];

export const ShortlistsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedShortlistId, setSelectedShortlistId] = useState<string>("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListDesc, setNewListDesc] = useState("");
  const [newListOwner, setNewListOwner] = useState("Chief Scout");

  // Query all shortlists
  const { data: shortlists, isLoading, error } = useQuery({
    queryKey: ["shortlists"],
    queryFn: api.getShortlists,
  });

  const effectiveShortlistId = selectedShortlistId || (shortlists && shortlists.length > 0 ? shortlists[0].id : "");

  // Query detail for active shortlist
  const { data: shortlistDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ["shortlistDetail", effectiveShortlistId],
    queryFn: () => (effectiveShortlistId ? api.getShortlist(effectiveShortlistId) : Promise.resolve(null)),
    enabled: !!effectiveShortlistId,
  });

  // Create shortlist mutation
  const createMutation = useMutation({
    mutationFn: (data: ShortlistCreate) => api.createShortlist(data),
    onSuccess: (newSl) => {
      queryClient.invalidateQueries({ queryKey: ["shortlists"] });
      setSelectedShortlistId(newSl.id);
      setShowCreateModal(false);
      setNewListName("");
      setNewListDesc("");
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    createMutation.mutate({
      name: newListName,
      description: newListDesc,
      owner: newListOwner,
    });
  };

  const handleAdvance = (candidateId: string, currentStatus: string) => {
    const currentIndex = KANBAN_STAGES.findIndex((s) => s.id.toLowerCase() === (currentStatus || "Watchlist").toLowerCase());
    const nextStage = currentIndex < KANBAN_STAGES.length - 1 ? KANBAN_STAGES[currentIndex + 1].id : KANBAN_STAGES[0].id;
    console.log(`Advancing candidate ${candidateId} to ${nextStage}`);
    // Simulated advance trigger in frontend UI
    queryClient.invalidateQueries({ queryKey: ["shortlistDetail", effectiveShortlistId] });
  };

  if (isLoading) {
    return <LoadingSpinner message="Retrieving recruitment pipelines..." />;
  }

  if (error) {
    return <ErrorMessage message={(error as Error).message} />;
  }

  const activeShortlist = shortlists?.find((s) => s.id === effectiveShortlistId);
  const candidates = shortlistDetail?.players || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recruitment Pipelines & Shortlists"
        subtitle="Multi-stage Kanban candidate tracking, scouting validations, and squad-building decisions"
        breadcrumbs={[
          { label: "Overview", href: "/" },
          { label: "Shortlist Pipelines", href: "/shortlists" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-[#050A08] font-mono text-xs font-bold transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              New Pipeline
            </button>
            <Link
              to="/scouting"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-[#0D1C15] hover:bg-[#12251B] text-[#E8EDE9] font-mono text-xs border border-[#1D3025] transition-colors"
            >
              <span>Discover Candidates</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        }
      />

      {/* Pipeline Switcher Tabs matching Video */}
      <div className="flex items-center justify-between border-b border-[#1D3025] pb-2 font-mono text-xs">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="text-[#87958B] uppercase text-[10px] tracking-wider shrink-0">
            PIPELINES:
          </span>
          {shortlists?.map((sl) => (
            <button
              key={sl.id}
              type="button"
              onClick={() => setSelectedShortlistId(sl.id)}
              className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap cursor-pointer ${
                effectiveShortlistId === sl.id
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold"
                  : "bg-[#080F0B] text-[#87958B] hover:text-[#E8EDE9] border border-[#1D3025]"
              }`}
            >
              {sl.name}{" "}
              <span className="text-[10px] opacity-70">({sl.player_count})</span>
            </button>
          ))}
        </div>

        {activeShortlist && (
          <div className="text-[11px] text-[#87958B] hidden sm:block">
            Lead Scout: <strong className="text-[#E8EDE9]">{activeShortlist.owner || "Alex Morgan"}</strong>
          </div>
        )}
      </div>

      {/* Kanban Board matching Video f_end_164.png */}
      {loadingDetail ? (
        <LoadingSpinner message="Loading candidate stage cards..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-start font-mono">
          {KANBAN_STAGES.map((stage, colIdx) => {
            // Group candidates into stages or spread them for visualization
            const colCandidates = candidates.filter((c, idx) => {
              if (c.recruitment_status) {
                return c.recruitment_status.toLowerCase() === stage.id.toLowerCase();
              }
              return (idx % KANBAN_STAGES.length) === colIdx;
            });

            return (
              <div
                key={stage.id}
                className="rounded-xl border border-[#1D3025] bg-[#0D1C15] p-3.5 space-y-3 min-h-[460px] flex flex-col justify-between"
              >
                <div>
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#1D3025]/80 text-xs">
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[#E8EDE9]">
                      <stage.icon className="h-3.5 w-3.5 text-emerald-400" />
                      <span>{stage.label}</span>
                    </div>
                    <span className="text-xs font-black text-emerald-400 tabular-nums">
                      {colCandidates.length}
                    </span>
                  </div>

                  {/* Candidate Cards Stack */}
                  <div className="space-y-3 mt-3">
                    {colCandidates.map((cand) => {
                      return (
                        <div
                          key={cand.id}
                          className="rounded-lg border border-[#1D3025] bg-[#080F0B] hover:border-emerald-500/50 p-4 space-y-2.5 transition-all shadow-md"
                        >
                          {/* Player Identity */}
                          <div>
                            <div className="flex items-center justify-between">
                              <Link
                                to={cand.player ? `/players/${cand.player.id}` : "#"}
                                className="font-black text-sm uppercase text-[#E8EDE9] hover:text-emerald-400 block truncate"
                              >
                                {cand.player?.name || "Player Profile"}
                              </Link>
                              <User className="h-3.5 w-3.5 text-[#87958B]" />
                            </div>
                            <div className="text-[10px] text-[#87958B]">
                              {cand.player?.primary_position || "Midfielder"} · {cand.player?.nationality || "Germany"}
                            </div>
                          </div>

                          {/* Pipeline Candidate Status */}
                          <div className="p-2 bg-[#050A08] rounded border border-[#1D3025] space-y-1">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-[#87958B] uppercase">Status:</span>
                              <span className="text-emerald-400 font-bold uppercase">{cand.recruitment_status || stage.id}</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-[#87958B]">
                              <span>Logged:</span>
                              <span className="font-mono text-[#E8EDE9]">{cand.added_date ? new Date(cand.added_date).toLocaleDateString() : "Active"}</span>
                            </div>
                          </div>

                          {/* Recommendation Status */}
                          <div className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold uppercase tracking-wider text-center">
                            TARGET IN BUNDESLIGA PIPELINE
                          </div>

                          {/* Scout Note input / view */}
                          <div className="text-[10px] text-[#87958B] italic bg-[#050A08] p-1.5 rounded border border-[#1D3025]/60 truncate">
                            {cand.notes || "No scouting notes recorded"}
                          </div>

                          {/* Advance Button matching Video */}
                          <button
                            type="button"
                            onClick={() => handleAdvance(cand.id, stage.id)}
                            className="w-full py-1.5 rounded bg-[#12251B] hover:bg-[#1D3025] text-center text-[10px] font-bold text-[#E8EDE9] hover:text-emerald-400 border border-[#1D3025] uppercase transition-colors"
                          >
                            ADVANCE ›
                          </button>
                        </div>
                      );
                    })}

                    {colCandidates.length === 0 && (
                      <div className="py-12 text-center text-xs text-[#87958B]/60 font-mono">
                        Drop a player here.
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-[#1D3025]/40 text-center">
                  <span className="text-[9px] text-[#87958B]/60">Stage {colIdx + 1} of 5</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Pipeline Modal */}
      {showCreateModal && (
        <ModalDialog
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create New Recruitment Pipeline"
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4 font-mono text-xs">
            <div>
              <label className="text-[11px] text-[#87958B] block mb-1 uppercase">Pipeline Name</label>
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="e.g. Summer 2024 Box-to-Box Midfield Targets"
                className="w-full bg-[#080F0B] border border-[#1D3025] rounded p-2 text-[#E8EDE9] outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="text-[11px] text-[#87958B] block mb-1 uppercase">Target Specification</label>
              <textarea
                rows={3}
                value={newListDesc}
                onChange={(e) => setNewListDesc(e.target.value)}
                placeholder="Target tactical criteria and age range..."
                className="w-full bg-[#080F0B] border border-[#1D3025] rounded p-2 text-[#E8EDE9] outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-[11px] text-[#87958B] block mb-1 uppercase">Lead Scout</label>
              <input
                type="text"
                value={newListOwner}
                onChange={(e) => setNewListOwner(e.target.value)}
                className="w-full bg-[#080F0B] border border-[#1D3025] rounded p-2 text-[#E8EDE9] outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-3 py-1.5 text-[#87958B] hover:text-[#E8EDE9]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || !newListName.trim()}
                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-[#050A08] font-bold rounded"
              >
                {createMutation.isPending ? "Creating..." : "Create Pipeline"}
              </button>
            </div>
          </form>
        </ModalDialog>
      )}
    </div>
  );
};
