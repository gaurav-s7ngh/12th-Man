import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy, CheckCircle, ExternalLink } from "lucide-react";
import { api } from "../services/api";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ErrorMessage } from "../components/common/ErrorMessage";

export const CompetitionsPage: React.FC = () => {
  const { data: competitions, isLoading, error } = useQuery({
    queryKey: ["competitions"],
    queryFn: api.getCompetitions,
  });

  if (isLoading) return <LoadingSpinner message="Loading competition registry..." />;
  if (error) return <ErrorMessage message={(error as Error).message} />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold font-mono tracking-tight text-white uppercase">
          Active Competitions & Datasets
        </h1>
        <p className="text-xs text-zinc-400 font-mono mt-0.5">
          Provider provenance and tournament metadata
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {competitions?.map((comp) => (
          <div
            key={comp.id}
            className="p-6 rounded-lg border border-zinc-800 bg-[#0b101d] space-y-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded mb-2">
                  <CheckCircle className="w-3 h-3" />
                  Primary Dataset
                </div>
                <h2 className="text-base font-bold font-mono text-zinc-100">
                  {comp.name} 2023/24
                </h2>
                <div className="text-xs text-zinc-400 font-mono mt-1">
                  Region: {comp.country || "Germany"} • Gender: {comp.gender || "Male"}
                </div>
              </div>
              <div className="w-10 h-10 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400">
                <Trophy className="w-5 h-5" />
              </div>
            </div>

            <div className="p-3.5 rounded bg-zinc-900/60 border border-zinc-800/80 text-xs font-mono text-zinc-400 space-y-1.5">
              <div className="flex justify-between">
                <span>External Provider ID:</span>
                <span className="text-zinc-200">{comp.external_id || "9"} (StatsBomb)</span>
              </div>
              <div className="flex justify-between">
                <span>Season:</span>
                <span className="text-zinc-200">2023/2024 (ID: 281)</span>
              </div>
              <div className="flex justify-between">
                <span>Total Matches:</span>
                <span className="text-emerald-400 font-bold">34 Fixtures</span>
              </div>
              <div className="flex justify-between">
                <span>Telemetry Ingestion:</span>
                <span className="text-emerald-400 font-bold">137,765 Events</span>
              </div>
            </div>

            <div className="pt-2 text-[11px] text-zinc-500 font-mono flex items-center justify-between">
              <span>Source: StatsBomb Open Data</span>
              <a
                href="https://github.com/statsbomb/open-data"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                <span>Licence & Docs</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
