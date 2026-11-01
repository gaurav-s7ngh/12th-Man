import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "../services/api";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ErrorMessage } from "../components/common/ErrorMessage";

export const MatchesPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["matches", page],
    queryFn: () => api.getMatches({ page, page_size: pageSize }),
  });

  if (isLoading) return <LoadingSpinner message="Loading match logs..." />;
  if (error) return <ErrorMessage message={(error as Error).message} onRetry={refetch} />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold font-mono tracking-tight text-white uppercase">
          Match Telemetry ({data?.total ?? 0} Fixtures)
        </h1>
        <p className="text-xs text-zinc-400 font-mono mt-0.5">
          All 34 1. Bundesliga 2023/24 matches with full event telemetry records
        </p>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-[#0b101d] overflow-hidden">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-[#090d18] border-b border-zinc-800 text-zinc-400 uppercase text-[10px] tracking-wider">
            <tr>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4 text-right">Home Team</th>
              <th className="py-3 px-4 text-center">Score</th>
              <th className="py-3 px-4">Away Team</th>
              <th className="py-3 px-4 text-right">Telemetry Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {data?.items.map((m) => (
              <tr key={m.id} className="hover:bg-zinc-900/50 transition">
                <td className="py-3 px-4 text-zinc-400">{m.match_date}</td>
                <td className="py-3 px-4 text-right font-medium text-zinc-200">
                  {m.home_team?.name}
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700/60 text-emerald-400 font-bold">
                    {m.home_score ?? 0} - {m.away_score ?? 0}
                  </span>
                </td>
                <td className="py-3 px-4 font-medium text-zinc-200">
                  {m.away_team?.name}
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-950/60 border border-emerald-800/50 text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Available (~3.5k events)
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {data && (
          <div className="py-3 px-4 border-t border-zinc-800 bg-[#090d18] flex items-center justify-between text-xs font-mono text-zinc-400">
            <div>
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, data.total)} of {data.total} fixtures
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>Page {page} of {data.total_pages}</span>
              <button
                disabled={page >= data.total_pages}
                onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                className="p-1 rounded bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
