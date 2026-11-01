import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, ArrowRight } from "lucide-react";
import { api } from "../services/api";
import { LoadingSpinner } from "../components/common/LoadingSpinner";

export const ScoutingPage: React.FC = () => {
  // Let's fetch sample player reports or all scouting reports
  const { data: playersData, isLoading } = useQuery({
    queryKey: ["scoutingPlayers"],
    queryFn: () => api.getPlayers({ page: 1, page_size: 50 }),
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold font-mono tracking-tight text-white uppercase">
          Scouting Intelligence & Assessments
        </h1>
        <p className="text-xs text-zinc-400 font-mono mt-0.5">
          Qualitative scouting assessments and multi-dimensional attribute grades
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Info card */}
        <div className="p-5 rounded-lg border border-zinc-800 bg-[#0b101d] space-y-3">
          <div className="w-8 h-8 rounded bg-emerald-950 border border-emerald-600/40 flex items-center justify-center text-emerald-400">
            <ClipboardList className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold font-mono text-white">Scouting Protocol</h2>
          <p className="text-xs text-zinc-400 leading-relaxed font-sans">
            Assessments combine real-match statistical metrics with expert tactical evaluation across technical, tactical, physical, and mental pillars.
          </p>
          <div className="pt-2 border-t border-zinc-800 text-[11px] font-mono text-zinc-500">
            Ratings strictly recorded by authorized scouts without fabrication.
          </div>
        </div>

        {/* Player Assessment Quicklinks */}
        <div className="md:col-span-2 p-5 rounded-lg border border-zinc-800 bg-[#0b101d] space-y-4">
          <h2 className="text-sm font-semibold font-mono uppercase tracking-wider text-zinc-200">
            Select a Player to View or Add Scouting Assessment
          </h2>
          {isLoading ? (
            <LoadingSpinner size="sm" message="Loading players..." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-96 overflow-y-auto pr-1">
              {playersData?.items.slice(0, 16).map((p) => (
                <Link
                  key={p.id}
                  to={`/players/${p.id}`}
                  className="p-2.5 rounded border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800/60 hover:border-emerald-600/40 flex items-center justify-between text-xs font-mono transition group"
                >
                  <div className="truncate">
                    <span className="text-zinc-200 group-hover:text-emerald-400 font-medium">
                      {p.name}
                    </span>
                    <div className="text-[10px] text-zinc-500">
                      {p.nationality || "Player"} • {p.primary_position || "Unspecified"}
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-400 transition" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
