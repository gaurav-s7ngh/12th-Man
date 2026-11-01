import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Shield, ArrowRight } from "lucide-react";
import { api } from "../services/api";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ErrorMessage } from "../components/common/ErrorMessage";

export const TeamsPage: React.FC = () => {
  const { data: teams, isLoading, error, refetch } = useQuery({
    queryKey: ["teams"],
    queryFn: api.getTeams,
  });

  if (isLoading) return <LoadingSpinner message="Loading participating squads..." />;
  if (error) return <ErrorMessage message={(error as Error).message} onRetry={refetch} />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold font-mono tracking-tight text-white uppercase">
          Tournament Teams ({teams?.length ?? 0})
        </h1>
        <p className="text-xs text-zinc-400 font-mono mt-0.5">
          UEFA Euro 2024 participating national teams and squad registries
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {teams?.map((team) => (
          <div
            key={team.id}
            className="p-5 rounded-lg border border-zinc-800 bg-[#0b101d] hover:border-emerald-600/40 transition group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center font-mono font-bold text-emerald-400 mb-3 text-sm">
                <Shield className="w-5 h-5" />
              </div>
              <h2 className="text-sm font-semibold text-zinc-200 group-hover:text-emerald-400 font-mono transition">
                {team.name}
              </h2>
              <div className="text-[11px] text-zinc-500 font-mono mt-1">
                Country: {team.country || team.name}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
              <span className="text-[11px] text-zinc-500 font-mono">26 Player Squad</span>
              <Link
                to={`/players?nationality=${encodeURIComponent(team.name)}`}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-mono flex items-center gap-1 transition"
              >
                <span>Roster</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
