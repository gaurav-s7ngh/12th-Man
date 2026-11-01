import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Check, Search, Shield, Users, RefreshCw } from "lucide-react";
import { api } from "../../services/api";
import type { AvailableClubItem } from "../../types/football";

const CLUB_CODE_MAP: Record<string, { code: string; colorClass: string }> = {
  leverkusen: { code: "B04", colorClass: "bg-red-950/80 text-red-400 border-red-500/50" },
  bayern: { code: "FCB", colorClass: "bg-red-900/80 text-red-200 border-red-600/50" },
  dortmund: { code: "BVB", colorClass: "bg-yellow-950/80 text-yellow-400 border-yellow-500/50" },
  stuttgart: { code: "VFB", colorClass: "bg-zinc-900 text-red-400 border-red-500/50" },
  leipzig: { code: "RBL", colorClass: "bg-red-950/70 text-zinc-100 border-red-500/40" },
  frankfurt: { code: "SGE", colorClass: "bg-zinc-900 text-red-400 border-zinc-700" },
  heidenheim: { code: "FCH", colorClass: "bg-blue-950/80 text-red-300 border-blue-500/40" },
  freiburg: { code: "SCF", colorClass: "bg-zinc-900 text-zinc-200 border-zinc-700" },
  augsburg: { code: "FCA", colorClass: "bg-emerald-950/80 text-red-400 border-emerald-600/40" },
  wolfsburg: { code: "WOB", colorClass: "bg-emerald-900/80 text-emerald-300 border-emerald-500/40" },
  hoffenheim: { code: "TSG", colorClass: "bg-blue-900/80 text-blue-300 border-blue-500/40" },
  bremen: { code: "SVW", colorClass: "bg-emerald-950/80 text-emerald-400 border-emerald-600/40" },
  mainz: { code: "M05", colorClass: "bg-red-950/80 text-red-300 border-red-500/40" },
  gladbach: { code: "BMG", colorClass: "bg-emerald-950/80 text-zinc-100 border-emerald-600/40" },
  "union berlin": { code: "FCU", colorClass: "bg-red-900/80 text-yellow-300 border-red-500/40" },
  bochum: { code: "BOC", colorClass: "bg-blue-950/80 text-blue-300 border-blue-600/40" },
  "kln": { code: "KOE", colorClass: "bg-red-950/80 text-zinc-100 border-red-500/40" },
  koln: { code: "KOE", colorClass: "bg-red-950/80 text-zinc-100 border-red-500/40" },
  darmstadt: { code: "D98", colorClass: "bg-blue-950/80 text-blue-300 border-blue-600/40" },
};

function getClubBadge(teamName: string) {
  const lower = teamName.toLowerCase();
  for (const [key, val] of Object.entries(CLUB_CODE_MAP)) {
    if (lower.includes(key)) {
      return val;
    }
  }
  const code = teamName
    .split(/\s+/)
    .slice(0, 3)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");
  return { code: code || "FC", colorClass: "bg-emerald-950/80 text-emerald-300 border-emerald-600/40" };
}

export const ClubSelector: React.FC = () => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: club, isLoading: loadingClub } = useQuery({
    queryKey: ["club"],
    queryFn: () => api.getClub(),
  });

  const { data: availableClubs = [], isLoading: loadingAvailable } = useQuery({
    queryKey: ["availableClubs"],
    queryFn: api.getAvailableClubs,
  });

  const switchClubMutation = useMutation({
    mutationFn: (targetId: string) => api.selectActiveClub(targetId),
    onSuccess: (updatedClub) => {
      localStorage.setItem("12th_man_active_club_id", updatedClub.id);
      // Invalidate all dependent query caches to dynamically update all views
      queryClient.invalidateQueries({ queryKey: ["club"] });
      queryClient.invalidateQueries({ queryKey: ["availableClubs"] });
      queryClient.invalidateQueries({ queryKey: ["squadAssessment"] });
      queryClient.invalidateQueries({ queryKey: ["recruitmentNeeds"] });
      queryClient.invalidateQueries({ queryKey: ["recruitmentMap"] });
      queryClient.invalidateQueries({ queryKey: ["squadArchetypeGaps"] });
      queryClient.invalidateQueries({ queryKey: ["teamDetail"] });
      setIsOpen(false);
      setFilterQuery("");
    },
  });

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const activeClubName = club?.name || "Bayer 04 Leverkusen";
  const activeBadge = getClubBadge(activeClubName);
  const activeFormation = club?.primary_formation || "3-4-2-1";

  const filteredClubs = availableClubs.filter((item: AvailableClubItem) => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      (item.manager_name && item.manager_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={loadingClub || switchClubMutation.isPending}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[#080F0B] hover:bg-[#0c1711] border border-[#1D3025] hover:border-emerald-500/50 transition-all text-left group focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
        title="Switch Analysed Club (18 Bundesliga Teams)"
      >
        {/* Crest Monogram */}
        <div
          className={`flex h-7 w-8 items-center justify-center rounded font-mono text-[11px] font-black tracking-tighter border shadow-sm transition-transform group-hover:scale-105 ${activeBadge.colorClass}`}
        >
          {activeBadge.code}
        </div>

        {/* Club Meta */}
        <div className="hidden sm:block text-left">
          <div className="flex items-center gap-1.5 leading-tight">
            <span className="font-bold text-[#E8EDE9] text-xs group-hover:text-emerald-400 transition-colors">
              {activeClubName}
            </span>
          </div>
          <div className="text-[10px] text-[#87958B] font-mono leading-tight flex items-center gap-1.5 mt-0.5">
            <span className="text-emerald-400/90 font-semibold">{activeFormation}</span>
            <span>·</span>
            <span>Bundesliga 23/24</span>
          </div>
        </div>

        <ChevronDown
          className={`h-3.5 w-3.5 text-[#87958B] transition-transform duration-200 ml-1 ${
            isOpen ? "rotate-180 text-emerald-400" : "group-hover:text-[#E8EDE9]"
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl border border-[#1D3025] bg-[#050A08] shadow-2xl z-50 overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3.5 border-b border-[#1D3025] bg-[#080F0B]/80 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1.5">
                <Shield className="h-3 w-3" />
                Active Analysed Club
              </div>
              <div className="text-xs text-[#E8EDE9] font-medium mt-0.5">
                Switch Tactical & Recruitment Lens
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {availableClubs.length || 18} Clubs
            </span>
          </div>

          {/* Quick Filter Search */}
          <div className="p-2.5 border-b border-[#1D3025]/60 bg-[#080F0B]">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#87958B]" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Filter by team or coach..."
                className="w-full h-8 rounded bg-[#050A08] border border-[#1D3025] pl-8 pr-2.5 text-xs text-[#E8EDE9] placeholder-[#87958B]/60 focus:border-emerald-500/60 focus:outline-none transition-colors"
                autoFocus
              />
            </div>
          </div>

          {/* Clubs Scrollable List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[#1D3025]/40 py-1 scrollbar-thin scrollbar-thumb-emerald-900/40">
            {loadingAvailable ? (
              <div className="p-6 text-center text-xs text-[#87958B] flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-emerald-400" />
                Loading Bundesliga clubs...
              </div>
            ) : filteredClubs.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#87958B]">
                No clubs match &ldquo;{filterQuery}&rdquo;
              </div>
            ) : (
              filteredClubs.map((teamItem: AvailableClubItem) => {
                const badge = getClubBadge(teamItem.name);
                const isCurrentActive =
                  teamItem.is_active ||
                  (club?.linked_team_id && teamItem.team_id === club.linked_team_id) ||
                  teamItem.name === activeClubName;
                const targetSelectId = (teamItem.team_id || teamItem.id) as string;

                return (
                  <button
                    key={targetSelectId || teamItem.name}
                    onClick={() => {
                      if (!isCurrentActive && targetSelectId) {
                        switchClubMutation.mutate(targetSelectId);
                      }
                    }}
                    disabled={switchClubMutation.isPending}
                    className={`w-full flex items-center justify-between p-2.5 text-left transition-colors group ${
                      isCurrentActive
                        ? "bg-emerald-950/30 border-l-2 border-emerald-400"
                        : "hover:bg-[#080F0B]"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Monogram */}
                      <div
                        className={`flex h-7 w-8 shrink-0 items-center justify-center rounded font-mono text-[10px] font-black border ${badge.colorClass}`}
                      >
                        {badge.code}
                      </div>

                      {/* Info */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-xs font-semibold truncate ${
                              isCurrentActive
                                ? "text-emerald-400 font-bold"
                                : "text-[#E8EDE9] group-hover:text-emerald-300"
                            }`}
                          >
                            {teamItem.name}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#87958B] font-mono truncate flex items-center gap-2 mt-0.5">
                          <span>{teamItem.manager_name || "Head Coach"}</span>
                          <span>·</span>
                          <span className="text-zinc-400">{teamItem.primary_formation}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right side: Squad Size & Active Check */}
                    <div className="flex items-center gap-2.5 shrink-0 ml-2">
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#87958B] bg-[#050A08] px-1.5 py-0.5 rounded border border-[#1D3025]">
                          <Users className="h-2.5 w-2.5 text-emerald-400" />
                          {teamItem.squad_size}
                        </span>
                      </div>
                      {isCurrentActive && (
                        <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Status */}
          <div className="p-2 border-t border-[#1D3025] bg-[#080F0B]/90 text-[10px] font-mono text-center text-[#87958B]">
            All 18 Bundesliga 23/24 squads loaded from live telemetry
          </div>
        </div>
      )}
    </div>
  );
};
