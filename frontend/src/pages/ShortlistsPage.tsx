import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, ArrowRight } from "lucide-react";
import { api } from "../services/api";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { EmptyState } from "../components/common/EmptyState";
import { getPositionBadgeClass } from "../lib/utils";

export const ShortlistsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedShortlistId, setSelectedShortlistId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [owner, setOwner] = useState("Chief Scout");

  const { data: shortlists, isLoading, error, refetch } = useQuery({
    queryKey: ["shortlists"],
    queryFn: api.getShortlists,
  });

  const activeShortlistId = selectedShortlistId || shortlists?.[0]?.id || null;

  const { data: shortlistDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ["shortlistDetail", activeShortlistId],
    queryFn: () => api.getShortlist(activeShortlistId!),
    enabled: !!activeShortlistId,
  });

  const createMutation = useMutation({
    mutationFn: api.createShortlist,
    onSuccess: (newSl) => {
      queryClient.invalidateQueries({ queryKey: ["shortlists"] });
      setSelectedShortlistId(newSl.id);
      setShowCreateModal(false);
      setName("");
      setDescription("");
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({ name, description, owner });
  };

  if (isLoading) return <LoadingSpinner message="Accessing recruitment shortlists..." />;
  if (error) return <ErrorMessage message={(error as Error).message} onRetry={refetch} />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-mono tracking-tight text-white uppercase">
            Recruitment Shortlists
          </h1>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Target pipeline tracking and transfer candidate lists
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Shortlist
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Shortlists List Sidebar */}
        <div className="space-y-2">
          <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 px-1">
            Shortlist Buckets ({shortlists?.length ?? 0})
          </div>

          {!shortlists || shortlists.length === 0 ? (
            <div className="p-4 rounded border border-dashed border-zinc-800 bg-[#090d18] text-xs font-mono text-zinc-500 text-center">
              No shortlists created yet.
            </div>
          ) : (
            shortlists.map((sl) => (
              <button
                key={sl.id}
                onClick={() => setSelectedShortlistId(sl.id)}
                className={`w-full text-left p-3 rounded-lg border transition font-mono text-xs cursor-pointer ${
                  activeShortlistId === sl.id
                    ? "bg-emerald-950/40 border-emerald-600 text-zinc-100"
                    : "bg-[#0b101d] border-zinc-800 text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                }`}
              >
                <div className="font-semibold text-zinc-200 truncate">{sl.name}</div>
                <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-1">
                  <span>{sl.owner || "Recruitment"}</span>
                  <span className="text-emerald-400 font-bold">{sl.player_count} players</span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Shortlist Player Details Table */}
        <div className="md:col-span-3 rounded-lg border border-zinc-800 bg-[#0b101d] p-5">
          {loadingDetail ? (
            <LoadingSpinner size="sm" message="Loading candidates..." />
          ) : !shortlistDetail ? (
            <EmptyState title="No shortlist selected" description="Select or create a shortlist." />
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold font-mono text-white">
                  {shortlistDetail.name}
                </h2>
                {shortlistDetail.description && (
                  <p className="text-xs text-zinc-400 mt-1">{shortlistDetail.description}</p>
                )}
              </div>

              {shortlistDetail.players.length === 0 ? (
                <EmptyState
                  title="Shortlist is currently empty"
                  description="Navigate to Player Discovery to evaluate and add prospects to this shortlist."
                  action={
                    <Link
                      to="/players"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600 text-white text-xs font-mono hover:bg-emerald-500 transition"
                    >
                      <span>Explore Players</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  }
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#090d18] border-b border-zinc-800 text-zinc-400 uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Player</th>
                        <th className="py-2.5 px-3">Position</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Notes</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {shortlistDetail.players.map((sp) => (
                        <tr key={sp.id} className="hover:bg-zinc-900/50">
                          <td className="py-3 px-3 font-medium text-zinc-200">
                            {sp.player?.name}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] border ${getPositionBadgeClass(
                                sp.player?.primary_position
                              )}`}
                            >
                              {sp.player?.primary_position || "Player"}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded bg-zinc-800 text-emerald-400 border border-zinc-700 text-[10px]">
                              {sp.recruitment_status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-zinc-400 max-w-xs truncate">
                            {sp.notes || "—"}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <Link
                              to={`/players/${sp.player_id}`}
                              className="text-emerald-400 hover:text-emerald-300 font-bold"
                            >
                              Profile →
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create Shortlist */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f172a] border border-zinc-800 rounded-lg max-w-md w-full p-6 space-y-4 font-mono text-xs">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Create Recruitment Shortlist
            </h3>
            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div>
                <label className="text-zinc-400 block mb-1 text-[11px]">Shortlist Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Summer 2025 Central Midfield Targets"
                  className="w-full bg-[#070a12] border border-zinc-800 rounded p-2 text-zinc-200"
                  required
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1 text-[11px]">Description / Objective</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Target criteria, tactical specifications, age profile..."
                  className="w-full bg-[#070a12] border border-zinc-800 rounded p-2 text-zinc-200"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1 text-[11px]">Owner / Department</label>
                <input
                  type="text"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  placeholder="e.g. Chief Scout"
                  className="w-full bg-[#070a12] border border-zinc-800 rounded p-2 text-zinc-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  {createMutation.isPending ? "Creating..." : "Create Shortlist"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
