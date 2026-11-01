import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, ChevronLeft, ChevronRight, User } from "lucide-react";
import { api } from "../services/api";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { EmptyState } from "../components/common/EmptyState";
import { getPositionBadgeClass } from "../lib/utils";

const positionFilters = [
  { label: "All Positions", value: "" },
  { label: "Forwards", value: "Forward" },
  { label: "Wingers", value: "Wing" },
  { label: "Midfielders", value: "Midfield" },
  { label: "Defenders", value: "Back" },
  { label: "Goalkeepers", value: "Goalkeeper" },
];

export const PlayersPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPosition, setSelectedPosition] = useState("");
  const pageSize = 20;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["players", page, searchTerm, selectedPosition],
    queryFn: () =>
      api.getPlayers({
        page,
        page_size: pageSize,
        search: searchTerm || undefined,
        position: selectedPosition || undefined,
      }),
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-mono tracking-tight text-white uppercase">
            Player Discovery
          </h1>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Database of {data?.total ?? "..."} players verified from StatsBomb match event telemetry
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-lg border border-zinc-800 bg-[#0b101d] p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by player name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#070a12] border border-zinc-800 rounded px-9 py-1.5 text-xs font-mono text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
          />
        </form>

        {/* Position filters */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {positionFilters.map((f) => (
            <button
              key={f.label}
              onClick={() => {
                setSelectedPosition(f.value);
                setPage(1);
              }}
              className={`px-2.5 py-1 text-[11px] font-mono rounded border transition cursor-pointer ${
                selectedPosition === f.value
                  ? "bg-emerald-950 text-emerald-300 border-emerald-600"
                  : "bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:bg-zinc-800"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Players Data Table */}
      {isLoading ? (
        <LoadingSpinner message="Querying player database..." />
      ) : error ? (
        <ErrorMessage message={(error as Error).message} onRetry={refetch} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          title="No players match current criteria"
          description="Try broadening your search term or clearing the position filters."
        />
      ) : (
        <div className="rounded-lg border border-zinc-800 bg-[#0b101d] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#090d18] border-b border-zinc-800 text-zinc-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Player Name</th>
                  <th className="py-3 px-4">Nationality</th>
                  <th className="py-3 px-4">Primary Position</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {data.items.map((player) => (
                  <tr
                    key={player.id}
                    className="hover:bg-zinc-900/50 transition group"
                  >
                    <td className="py-3 px-4 font-medium text-zinc-200 flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-400">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <Link
                        to={`/players/${player.id}`}
                        className="hover:text-emerald-400 transition"
                      >
                        {player.name}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-zinc-400">
                      {player.nationality || "—"}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] border ${getPositionBadgeClass(
                          player.primary_position
                        )}`}
                      >
                        {player.primary_position || "Unspecified"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/players/${player.id}`}
                        className="inline-flex items-center px-2.5 py-1 rounded bg-zinc-800/80 hover:bg-emerald-950 hover:text-emerald-300 hover:border-emerald-700 border border-zinc-700 text-[11px] text-zinc-300 transition"
                      >
                        Profile
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="py-3 px-4 border-t border-zinc-800 bg-[#090d18] flex items-center justify-between text-xs font-mono text-zinc-400">
            <div>
              Showing{" "}
              <span className="text-zinc-200">
                {(page - 1) * pageSize + 1}
              </span>{" "}
              to{" "}
              <span className="text-zinc-200">
                {Math.min(page * pageSize, data.total)}
              </span>{" "}
              of <span className="text-zinc-200">{data.total}</span> players
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-200 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>
                Page {page} of {data.total_pages}
              </span>
              <button
                disabled={page >= data.total_pages}
                onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                className="p-1 rounded bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-200 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
