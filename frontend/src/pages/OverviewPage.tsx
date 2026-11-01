import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Users, Shield, Calendar, Activity, ArrowRight, Trophy, Zap, Target } from "lucide-react";
import { api } from "../services/api";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { getPositionBadgeClass } from "../lib/utils";

export const OverviewPage: React.FC = () => {
  const { data: playersData, isLoading: loadingPlayers, error: playerError } = useQuery({
    queryKey: ["overviewPlayers"],
    queryFn: () => api.getPlayers({ page: 1, page_size: 6 }),
  });

  const { data: matchesData, isLoading: loadingMatches } = useQuery({
    queryKey: ["overviewMatches"],
    queryFn: () => api.getMatches({ page: 1, page_size: 5 }),
  });

  const { data: teamsData, isLoading: loadingTeams } = useQuery({
    queryKey: ["overviewTeams"],
    queryFn: api.getTeams,
  });

  if (loadingPlayers || loadingMatches || loadingTeams) {
    return <LoadingSpinner message="Assembling tournament intelligence..." />;
  }

  if (playerError) {
    return <ErrorMessage message={(playerError as Error).message} />;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="rounded-xl border border-zinc-800 bg-gradient-to-r from-[#0d1527] to-[#0a1120] p-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-[radial-gradient(circle_at_right,rgba(16,185,129,0.08),transparent_70%)] pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono uppercase tracking-wider mb-2">
              <Trophy className="w-3.5 h-3.5" />
              Dataset: UEFA Euro 2024
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white font-mono">
              12TH MAN SCOUTING INTELLIGENCE
            </h1>
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
              Professional recruitment and player evaluation platform powered by granular StatsBomb Open Data event telemetry.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/players"
              className="inline-flex items-center gap-2 px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium font-mono transition shadow-lg shadow-emerald-900/30"
            >
              <Zap className="w-4 h-4" />
              Discover Players
            </Link>
            <Link
              to="/shortlists"
              className="inline-flex items-center gap-2 px-4 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium font-mono border border-zinc-700 transition"
            >
              <Target className="w-4 h-4" />
              Shortlists
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-lg border border-zinc-800/80 bg-[#0c1220]">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-mono uppercase tracking-wider">Tournament Players</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-100 mt-2">
            {playersData?.total ?? 621}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1 font-mono">Profiles indexed & tracked</p>
        </div>

        <div className="p-5 rounded-lg border border-zinc-800/80 bg-[#0c1220]">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-mono uppercase tracking-wider">Matches Ingested</span>
            <Calendar className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-100 mt-2">
            {matchesData?.total ?? 51}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1 font-mono">100% tournament coverage</p>
        </div>

        <div className="p-5 rounded-lg border border-zinc-800/80 bg-[#0c1220]">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-mono uppercase tracking-wider">Telemetry Events</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-100 mt-2">
            187,924
          </div>
          <p className="text-[11px] text-zinc-500 mt-1 font-mono">JSONB event records stored</p>
        </div>

        <div className="p-5 rounded-lg border border-zinc-800/80 bg-[#0c1220]">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-mono uppercase tracking-wider">Competing Teams</span>
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-100 mt-2">
            {teamsData?.length ?? 24}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1 font-mono">National squad rosters</p>
        </div>
      </div>

      {/* Two Column Layout: Featured Players + Recent Matches */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Featured Players list */}
        <div className="lg:col-span-2 rounded-lg border border-zinc-800/80 bg-[#0b101d] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100 uppercase tracking-wider font-mono">
                Featured Tournament Talents
              </h2>
              <p className="text-xs text-zinc-500 font-mono">Real StatsBomb player profiles</p>
            </div>
            <Link
              to="/players"
              className="text-xs text-emerald-400 hover:text-emerald-300 font-mono flex items-center gap-1 transition"
            >
              <span>Explore all ({playersData?.total})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {playersData?.items.map((player) => (
              <Link
                key={player.id}
                to={`/players/${player.id}`}
                className="p-3.5 rounded border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/50 hover:border-emerald-600/40 transition group"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-semibold text-zinc-200 group-hover:text-emerald-400 transition truncate">
                      {player.name}
                    </div>
                    <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                      {player.nationality || "Unknown"}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border ${getPositionBadgeClass(
                      player.primary_position
                    )}`}
                  >
                    {player.primary_position || "Player"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Matches */}
        <div className="rounded-lg border border-zinc-800/80 bg-[#0b101d] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100 uppercase tracking-wider font-mono">
                Recent Fixtures
              </h2>
              <p className="text-xs text-zinc-500 font-mono">Tournament match results</p>
            </div>
            <Link
              to="/matches"
              className="text-xs text-emerald-400 hover:text-emerald-300 font-mono flex items-center gap-1 transition"
            >
              <span>All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {matchesData?.items.map((match) => (
              <div
                key={match.id}
                className="p-3 rounded border border-zinc-800/80 bg-zinc-900/40 text-xs"
              >
                <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono mb-1.5">
                  <span>{match.match_date}</span>
                  <span className="text-emerald-500/80">Completed</span>
                </div>
                <div className="flex items-center justify-between font-mono">
                  <span className="font-medium text-zinc-200 truncate max-w-[110px]">
                    {match.home_team?.name}
                  </span>
                  <span className="font-bold px-2 py-0.5 rounded bg-zinc-800 text-emerald-400 text-xs">
                    {match.home_score ?? 0} - {match.away_score ?? 0}
                  </span>
                  <span className="font-medium text-zinc-200 truncate max-w-[110px] text-right">
                    {match.away_team?.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
