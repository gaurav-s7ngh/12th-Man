import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import { PageHeader } from "../components/layout/PageHeader";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { PositionBadge } from "../components/football/PositionBadge";
import { ModalDialog } from "../components/common/ModalDialog";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  User,
  LayoutGrid,
  List,
} from "lucide-react";
import type { Player } from "../types/football";
import type { ScoutingReportCreate } from "../types/scouting";

export const ScoutingPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const initialRole = searchParams.get("role") || "";
  const initialPosition = searchParams.get("position") || "";
  const initialFoot = searchParams.get("foot") || "";

  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [selectedRole, setSelectedRole] = useState(initialRole || "All roles");
  const [positionFilter, setPositionFilter] = useState(initialPosition);
  const [preferredFootFilter, setPreferredFootFilter] = useState(initialFoot);
  const [competitionFilter] = useState("");
  const [minMinutes, setMinMinutes] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>("minutes");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Modal states
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showShortlistModal, setShowShortlistModal] = useState(false);
  const [showSimilarModal, setShowSimilarModal] = useState(false);
  const [similarTargetPlayer, setSimilarTargetPlayer] = useState<Player | null>(null);

  // Form states
  const [scoutName, setScoutName] = useState("Chief Scout");
  const [positionAssessed, setPositionAssessed] = useState("");
  const [overallRating, setOverallRating] = useState(7.5);
  const [technicalRating, setTechnicalRating] = useState(7.5);
  const [tacticalRating, setTacticalRating] = useState(7.5);
  const [physicalRating, setPhysicalRating] = useState(7.0);
  const [mentalRating, setMentalRating] = useState(8.0);
  const [strengths, setStrengths] = useState("Ball progression, defensive workrate");
  const [weaknesses] = useState("Aerially vulnerable under physical duels");
  const [writtenObs, setWrittenObs] = useState("");

  const [selectedShortlistId, setSelectedShortlistId] = useState("");
  const [shortlistNotes, setShortlistNotes] = useState("");

  // Sync debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Competitions query removed — Bundesliga-only; competition filter not user-facing
  // const { data: competitions } = useQuery({ ... });

  // Query players with full, live, connected filters
  const { data: playersData, isLoading: loadingPlayers, error: playersError } = useQuery({
    queryKey: [
      "scoutingPlayers",
      page,
      debouncedSearch,
      positionFilter,
      selectedRole,
      preferredFootFilter,
      competitionFilter,
      minMinutes,
      sortBy,
      sortOrder,
    ],
    queryFn: () =>
      api.getPlayers({
        page,
        page_size: 24,
        search: debouncedSearch || undefined,
        position: positionFilter || undefined,
        role: selectedRole !== "All roles" ? selectedRole : undefined,
        preferred_foot: preferredFootFilter || undefined,
        competition_id: competitionFilter || undefined,
        min_minutes: minMinutes > 0 ? minMinutes : undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      }),
  });

  // Query shortlists
  const { data: shortlists } = useQuery({
    queryKey: ["shortlists"],
    queryFn: api.getShortlists,
  });

  // Query similar players when modal is open
  const { data: similarPlayers, isLoading: loadingSimilar } = useQuery({
    queryKey: ["similarPlayers", similarTargetPlayer?.id],
    queryFn: () =>
      similarTargetPlayer ? api.getSimilarPlayers(similarTargetPlayer.id, 5) : Promise.resolve([]),
    enabled: !!similarTargetPlayer,
  });

  const handleCreateReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayer) return;

    const reportData: ScoutingReportCreate = {
      scout_name: scoutName,
      position_assessed: positionAssessed || selectedPlayer.primary_position || "Player",
      overall_rating: overallRating,
      technical_rating: technicalRating,
      tactical_rating: tacticalRating,
      physical_rating: physicalRating,
      mental_rating: mentalRating,
      strengths: strengths.split(",").map((s) => s.trim()).filter(Boolean),
      weaknesses: weaknesses.split(",").map((s) => s.trim()).filter(Boolean),
      written_observations: writtenObs,
      assessment_date: new Date().toISOString().split("T")[0],
    };

    try {
      await api.createPlayerScoutingReport(selectedPlayer.id, reportData);
      setShowReportModal(false);
      setWrittenObs("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddToShortlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayer || !selectedShortlistId) return;

    try {
      await api.addPlayerToShortlist(selectedShortlistId, {
        player_id: selectedPlayer.id,
        notes: shortlistNotes || "Added from scouting discovery cards",
        recruitment_status: "Target",
      });
      setShowShortlistModal(false);
      setShortlistNotes("");
    } catch (err) {
      console.error(err);
    }
  };

  const openSimilarModal = (p: Player) => {
    setSimilarTargetPlayer(p);
    setShowSimilarModal(true);
  };

  const handleResetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setPositionFilter("");
    setSelectedRole("All roles");
    setPreferredFootFilter("");
    setMinMinutes(0);
    setSortBy("minutes");
    setSortOrder("desc");
    setPage(1);
    setSearchParams({});
  };

  const hasActiveFilters = Boolean(
    debouncedSearch ||
    positionFilter ||
    (selectedRole && selectedRole !== "All roles") ||
    preferredFootFilter ||
    minMinutes > 0
  );

  const totalPages = playersData?.total_pages || 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scouting Intelligence & Player Discovery"
        subtitle="Individual player evaluation dossiers and league-wide statistical discovery"
        breadcrumbs={[
          { label: "Overview", href: "/" },
          { label: "Scouting Intelligence", href: "/scouting" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-[#080F0B] border border-[#1D3025] rounded p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === "cards" ? "bg-emerald-500/20 text-emerald-400" : "text-[#87958B] hover:text-[#E8EDE9]"
                }`}
                title="Cards view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === "table" ? "bg-emerald-500/20 text-emerald-400" : "text-[#87958B] hover:text-[#E8EDE9]"
                }`}
                title="Table view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            <Link
              to="/analytics-lab"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-[#050A08] font-mono text-xs font-bold transition-colors"
            >
              <span>Market Map</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        }
      />

      {/* Main Grid: Left Filters, Right Cards matching Video frame_060.png */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Dense Filter Controls (3 Cols) */}
        <div className="lg:col-span-3 rounded-xl border border-[#1D3025] bg-[#0D1C15] p-5 space-y-5 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-[#1D3025] pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#E8EDE9]">
              FILTERS
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors uppercase font-bold"
              >
                Reset All
              </button>
            )}
          </div>

          {/* Quick Search */}
          <div>
            <label className="text-[10px] uppercase text-[#87958B] block mb-1">Search Player</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#87958B]" />
              <input
                type="text"
                placeholder="Name or surname..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#080F0B] border border-[#1D3025] rounded pl-8 pr-2.5 py-1.5 text-xs text-[#E8EDE9] placeholder-[#87958B]/60 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          {/* Position Dropdown */}
          <div>
            <label className="text-[10px] uppercase text-[#87958B] block mb-1">Position Group</label>
            <select
              value={positionFilter}
              onChange={(e) => {
                setPositionFilter(e.target.value);
                setPage(1);
              }}
              className="w-full bg-[#080F0B] border border-[#1D3025] rounded p-2 text-xs text-[#E8EDE9] outline-none"
            >
              <option value="">All Positions</option>
              <option value="Midfielder">Midfielders (CM / DM / AM)</option>
              <option value="Forward">Forwards & Wingers (CF / W)</option>
              <option value="Defender">Defenders (CB / FB / WB)</option>
              <option value="Goalkeeper">Goalkeepers (GK)</option>
            </select>
          </div>

          {/* Role Dropdown */}
          <div>
            <label className="text-[10px] uppercase text-[#87958B] block mb-1">Tactical Role Profile</label>
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setPage(1);
              }}
              className="w-full bg-[#080F0B] border border-[#1D3025] rounded p-2 text-xs text-[#E8EDE9] outline-none"
            >
              <option value="All roles">All roles</option>
              <option value="Ball-Winning Destroyer">Ball-Winning Destroyer</option>
              <option value="Deep-Lying Playmaker">Deep-Lying Playmaker</option>
              <option value="Box-to-Box Engine">Box-to-Box Engine</option>
              <option value="Inverted Creator">Inverted Creator</option>
              <option value="Ball-Playing Defender">Ball-Playing Defender</option>
              <option value="Clinical Poacher">Clinical Poacher</option>
              <option value="Attacking Wingback">Attacking Wingback</option>
            </select>
          </div>

          {/* Preferred Foot Dropdown */}
          <div>
            <label className="text-[10px] uppercase text-[#87958B] block mb-1">Preferred Foot</label>
            <select
              value={preferredFootFilter}
              onChange={(e) => {
                setPreferredFootFilter(e.target.value);
                setPage(1);
              }}
              className="w-full bg-[#080F0B] border border-[#1D3025] rounded p-2 text-xs text-[#E8EDE9] outline-none"
            >
              <option value="">Either / Any Foot</option>
              <option value="Right">Right Foot Only</option>
              <option value="Left">Left Foot Only</option>
              <option value="Both">Both Feet Capable</option>
            </select>
          </div>

          {/* Playing Time Threshold */}
          <div>
            <label className="text-[10px] uppercase text-[#87958B] block mb-1">Playing Time (Telemetry)</label>
            <select
              value={minMinutes}
              onChange={(e) => {
                setMinMinutes(Number(e.target.value));
                setPage(1);
              }}
              className="w-full bg-[#080F0B] border border-[#1D3025] rounded p-2 text-xs text-[#E8EDE9] outline-none"
            >
              <option value={0}>All Active Players (0+ mins)</option>
              <option value={90}>90+ Minutes (Sample min)</option>
              <option value={180}>180+ Minutes (2+ Matches)</option>
              <option value={450}>450+ Minutes (5+ Matches)</option>
              <option value={900}>900+ Minutes (10+ Matches)</option>
              <option value={1800}>1800+ Minutes (Starter Core)</option>
            </select>
          </div>

          {/* Sorting */}
          <div className="pt-2 border-t border-[#1D3025] space-y-2">
            <label className="text-[10px] uppercase text-[#87958B] block">Sort Candidates</label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full bg-[#080F0B] border border-[#1D3025] rounded p-1.5 text-xs text-[#E8EDE9] outline-none"
              >
                <option value="minutes">Total Minutes</option>
                <option value="name">Player Name</option>
                <option value="position">Position</option>
                <option value="nationality">Nationality</option>
              </select>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
                className="w-full bg-[#080F0B] border border-[#1D3025] rounded p-1.5 text-xs text-[#E8EDE9] outline-none"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>

          {/* Reset Filters CTA */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="w-full py-2 bg-[#080F0B] hover:bg-[#12251B] border border-[#1D3025] text-emerald-400 font-bold rounded text-xs uppercase tracking-wider transition-colors"
            >
              Clear All Filters
            </button>
          )}
        </div>

        {/* Right Column: Player Discovery Cards / Table (9 Cols) */}
        <div className="lg:col-span-9 space-y-4">
          {/* Active Filter Chips & Results Count Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border border-[#1D3025] bg-[#080F0B] font-mono text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[#87958B]">
                Found <strong className="text-emerald-400">{playersData?.total || 0}</strong> players:
              </span>

              {debouncedSearch && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[11px]">
                  Name: &ldquo;{debouncedSearch}&rdquo;
                  <button onClick={() => setSearch("")} className="hover:text-white ml-0.5">×</button>
                </span>
              )}
              {positionFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[11px]">
                  Pos: {positionFilter}
                  <button onClick={() => setPositionFilter("")} className="hover:text-white ml-0.5">×</button>
                </span>
              )}
              {selectedRole !== "All roles" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[11px]">
                  Role: {selectedRole}
                  <button onClick={() => setSelectedRole("All roles")} className="hover:text-white ml-0.5">×</button>
                </span>
              )}
              {preferredFootFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[11px]">
                  Foot: {preferredFootFilter}
                  <button onClick={() => setPreferredFootFilter("")} className="hover:text-white ml-0.5">×</button>
                </span>
              )}
              {minMinutes > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[11px]">
                  Min: {minMinutes}m+
                  <button onClick={() => setMinMinutes(0)} className="hover:text-white ml-0.5">×</button>
                </span>
              )}
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-[11px] text-[#87958B] hover:text-[#E8EDE9] underline"
              >
                Clear all filters
              </button>
            )}
          </div>

          {loadingPlayers ? (
            <LoadingSpinner message="Evaluating player profiles against squad tactical matrix..." />
          ) : playersError ? (
            <ErrorMessage message={(playersError as Error).message} />
          ) : (playersData?.items.length || 0) === 0 ? (
            <div className="rounded-xl border border-[#1D3025] bg-[#0D1C15] p-12 text-center space-y-4 font-mono">
              <div className="text-3xl text-[#87958B]">🔍</div>
              <h3 className="text-lg font-bold text-[#E8EDE9]">No players match your active filters</h3>
              <p className="text-xs text-[#87958B] max-w-md mx-auto">
                No Bundesliga records satisfy the selected position, role, foot, and minutes criteria simultaneously.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2 rounded bg-emerald-500 hover:bg-emerald-400 text-[#050A08] font-bold text-xs uppercase"
              >
                Reset All Filters
              </button>
            </div>
          ) : viewMode === "cards" ? (
            /* Cards View matching Video frame_060.png with REAL telemetry */
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {playersData?.items.map((player) => {
                  const mins = player.total_minutes || 0;
                  const confidence =
                    mins >= 900
                      ? "Extensive (>900m)"
                      : mins >= 270
                      ? "Sufficient (>270m)"
                      : mins >= 90
                      ? "Limited (90-269m)"
                      : "Minimal (<90m)";

                  return (
                    <div
                      key={player.id}
                      className="rounded-xl border border-[#1D3025] bg-gradient-to-b from-[#0D1C15] to-[#080F0B] hover:border-emerald-500/60 transition-all p-5 flex flex-col justify-between space-y-4 shadow-xl group"
                    >
                      {/* Top Row: Total Minutes & Position */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-2xl font-black font-mono text-[#E8EDE9] leading-none tabular-nums">
                            {mins.toLocaleString()} <span className="text-xs font-normal text-[#87958B]">MINS</span>
                          </div>
                          <div className="mt-1">
                            <PositionBadge position={player.primary_position} />
                          </div>
                        </div>

                        {/* Silhouette Avatar */}
                        <div className="h-11 w-11 rounded-full bg-[#12251B] border border-[#1D3025] flex items-center justify-center text-emerald-400 shrink-0">
                          <User className="h-5 w-5 opacity-80" />
                        </div>
                      </div>

                      {/* Player Identity */}
                      <div className="space-y-1 text-center">
                        <Link
                          to={`/players/${player.id}`}
                          className="font-black text-lg text-[#E8EDE9] uppercase tracking-tight hover:text-emerald-400 transition-colors block truncate"
                        >
                          {player.name}
                        </Link>
                        <div className="text-[11px] font-mono text-[#87958B] truncate">
                          {player.current_team || "Bundesliga Club"} · {player.nationality || "International"}
                        </div>
                        <div className="text-xs font-mono font-bold text-emerald-400 tracking-wider uppercase pt-0.5">
                          {selectedRole !== "All roles"
                            ? selectedRole.toUpperCase()
                            : (player.primary_position || "PLAYER").toUpperCase()}
                        </div>
                      </div>

                      {/* Telemetry Metadata Breakdown */}
                      <div className="grid grid-cols-2 gap-2 py-2.5 border-y border-[#1D3025]/80 text-center font-mono text-xs">
                        <div>
                          <div className="text-[10px] text-[#87958B] uppercase">PREFERRED FOOT</div>
                          <div className="text-sm font-bold text-emerald-400 mt-0.5">
                            {player.preferred_foot ? `${player.preferred_foot} Foot` : "Unknown"}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-[#87958B] uppercase">TELEMETRY SAMPLE</div>
                          <div className="text-sm font-bold text-[#E8EDE9] mt-0.5 truncate">
                            {confidence}
                          </div>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="grid grid-cols-3 gap-1.5 pt-1 font-mono text-xs">
                        <Link
                          to={`/players/${player.id}`}
                          className="py-1.5 bg-[#080F0B] hover:bg-[#12251B] border border-[#1D3025] text-center text-[#E8EDE9] rounded text-[11px] font-bold uppercase transition-colors"
                        >
                          DOSSIER
                        </Link>
                        <Link
                          to={`/compare?playerA=${player.id}`}
                          className="py-1.5 bg-[#080F0B] hover:bg-[#12251B] border border-[#1D3025] text-center text-[#E8EDE9] rounded text-[11px] font-bold uppercase transition-colors"
                        >
                          COMPARE
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPlayer(player);
                            setShowShortlistModal(true);
                          }}
                          className="py-1.5 bg-[#080F0B] hover:bg-[#12251B] border border-[#1D3025] text-center text-emerald-400 rounded text-[11px] font-bold uppercase transition-colors"
                        >
                          + SHORTLIST
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Right CTA to Next Step */}
              <div className="flex items-center justify-between pt-4 border-t border-[#1D3025] font-mono text-xs">
                <span className="text-[#87958B]">
                  STEP 5 OF 10: CANDIDATE DISCOVERY
                </span>
                <Link
                  to="/analytics-lab"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded bg-emerald-500 hover:bg-emerald-400 text-[#050A08] font-black uppercase tracking-wider transition-colors shadow-lg"
                >
                  <span>NEXT: ANALYTICS LAB</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ) : (
            /* Tabular View with Sorting and Real Telemetry */
            <div className="rounded-xl border border-[#1D3025] bg-[#0D1C15] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono text-[#E8EDE9]">
                  <thead className="bg-[#080F0B] border-b border-[#1D3025] text-[10px] uppercase text-[#87958B]">
                    <tr>
                      <th
                        className="py-3 px-4 cursor-pointer hover:text-white"
                        onClick={() => {
                          setSortBy("name");
                          setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                        }}
                      >
                        Player {sortBy === "name" && (sortOrder === "asc" ? "↑" : "↓")}
                      </th>
                      <th className="py-3 px-4">Club</th>
                      <th
                        className="py-3 px-4 cursor-pointer hover:text-white"
                        onClick={() => {
                          setSortBy("position");
                          setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                        }}
                      >
                        Position {sortBy === "position" && (sortOrder === "asc" ? "↑" : "↓")}
                      </th>
                      <th className="py-3 px-4">Nationality</th>
                      <th className="py-3 px-4">Foot</th>
                      <th
                        className="py-3 px-4 text-right cursor-pointer hover:text-white"
                        onClick={() => {
                          setSortBy("minutes");
                          setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
                        }}
                      >
                        Minutes {sortBy === "minutes" && (sortOrder === "desc" ? "↓" : "↑")}
                      </th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1D3025]/60">
                    {playersData?.items.map((player) => (
                      <tr key={player.id} className="hover:bg-[#12251B]/50 transition-colors">
                        <td className="py-3 px-4 font-bold">
                          <Link to={`/players/${player.id}`} className="hover:text-emerald-400">
                            {player.name}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-[#87958B]">
                          {player.current_team || "Bundesliga Club"}
                        </td>
                        <td className="py-3 px-4">
                          <PositionBadge position={player.primary_position} />
                        </td>
                        <td className="py-3 px-4 text-[#87958B]">
                          {player.nationality || "—"}
                        </td>
                        <td className="py-3 px-4 text-emerald-400 font-semibold">
                          {player.preferred_foot || "—"}
                        </td>
                        <td className="py-3 px-4 text-right font-bold tabular-nums">
                          {(player.total_minutes || 0).toLocaleString()} m
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openSimilarModal(player)}
                              className="px-2 py-0.5 rounded bg-[#080F0B] hover:bg-[#12251B] text-cyan-400 border border-[#1D3025] text-[10px]"
                            >
                              Similar
                            </button>
                            <Link
                              to={`/players/${player.id}`}
                              className="px-2 py-0.5 rounded bg-[#080F0B] hover:bg-[#12251B] text-[#E8EDE9] border border-[#1D3025] text-[10px]"
                            >
                              Dossier
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

          {/* Pagination */}
          <div className="flex items-center justify-between font-mono text-xs text-[#87958B] pt-2">
            <div>
              Page <strong className="text-[#E8EDE9]">{page}</strong> of <strong className="text-[#E8EDE9]">{totalPages}</strong>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-2 rounded bg-[#0D1C15] border border-[#1D3025] disabled:opacity-40 hover:text-[#E8EDE9]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-2 rounded bg-[#0D1C15] border border-[#1D3025] disabled:opacity-40 hover:text-[#E8EDE9]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Log Report Modal */}
      {showReportModal && selectedPlayer && (
        <ModalDialog
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          title={`Log Scouting Report: ${selectedPlayer.name}`}
        >
          <form onSubmit={handleCreateReportSubmit} className="space-y-4 font-mono text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#87958B] uppercase mb-1">Scout Name</label>
                <input
                  type="text"
                  required
                  value={scoutName}
                  onChange={(e) => setScoutName(e.target.value)}
                  className="w-full bg-[#080F0B] border border-[#1D3025] rounded p-2 text-[#E8EDE9]"
                />
              </div>
              <div>
                <label className="block text-[#87958B] uppercase mb-1">Position Evaluated</label>
                <input
                  type="text"
                  value={positionAssessed}
                  onChange={(e) => setPositionAssessed(e.target.value)}
                  className="w-full bg-[#080F0B] border border-[#1D3025] rounded p-2 text-[#E8EDE9]"
                />
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2">
              <div>
                <label className="block text-[10px] text-[#87958B] uppercase">Tech</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="10"
                  value={technicalRating}
                  onChange={(e) => setTechnicalRating(Number(e.target.value))}
                  className="w-full bg-[#080F0B] border border-[#1D3025] rounded p-1.5 text-center text-[#E8EDE9]"
                />
              </div>
              <div>
                <label className="block text-[10px] text-[#87958B] uppercase">Tact</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="10"
                  value={tacticalRating}
                  onChange={(e) => setTacticalRating(Number(e.target.value))}
                  className="w-full bg-[#080F0B] border border-[#1D3025] rounded p-1.5 text-center text-[#E8EDE9]"
                />
              </div>
              <div>
                <label className="block text-[10px] text-[#87958B] uppercase">Phys</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="10"
                  value={physicalRating}
                  onChange={(e) => setPhysicalRating(Number(e.target.value))}
                  className="w-full bg-[#080F0B] border border-[#1D3025] rounded p-1.5 text-center text-[#E8EDE9]"
                />
              </div>
              <div>
                <label className="block text-[10px] text-[#87958B] uppercase">Ment</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="10"
                  value={mentalRating}
                  onChange={(e) => setMentalRating(Number(e.target.value))}
                  className="w-full bg-[#080F0B] border border-[#1D3025] rounded p-1.5 text-center text-[#E8EDE9]"
                />
              </div>
              <div>
                <label className="block text-[10px] text-emerald-400 uppercase font-bold">Overall</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="10"
                  value={overallRating}
                  onChange={(e) => setOverallRating(Number(e.target.value))}
                  className="w-full bg-[#080F0B] border border-emerald-500/50 rounded p-1.5 text-center text-emerald-400 font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-[#87958B] uppercase mb-1">Key Strengths</label>
              <input
                type="text"
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                className="w-full bg-[#080F0B] border border-[#1D3025] rounded p-2 text-[#E8EDE9]"
              />
            </div>

            <div>
              <label className="block text-[#87958B] uppercase mb-1">Observations</label>
              <textarea
                rows={3}
                value={writtenObs}
                onChange={(e) => setWrittenObs(e.target.value)}
                className="w-full bg-[#080F0B] border border-[#1D3025] rounded p-2 text-[#E8EDE9]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="px-3 py-1.5 text-[#87958B] hover:text-[#E8EDE9]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-[#050A08] font-bold rounded"
              >
                Save Report
              </button>
            </div>
          </form>
        </ModalDialog>
      )}

      {/* Shortlist Modal */}
      {showShortlistModal && selectedPlayer && (
        <ModalDialog
          isOpen={showShortlistModal}
          onClose={() => setShowShortlistModal(false)}
          title={`Add ${selectedPlayer.name} to Shortlist`}
        >
          <form onSubmit={handleAddToShortlistSubmit} className="space-y-4 font-mono text-xs">
            <div>
              <label className="block text-[#87958B] uppercase mb-1">Select Shortlist</label>
              <select
                value={selectedShortlistId}
                onChange={(e) => setSelectedShortlistId(e.target.value)}
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
                rows={3}
                value={shortlistNotes}
                onChange={(e) => setShortlistNotes(e.target.value)}
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

      {/* Similar Players Modal */}
      {showSimilarModal && similarTargetPlayer && (
        <ModalDialog
          isOpen={showSimilarModal}
          onClose={() => setShowSimilarModal(false)}
          title={`Comparable Profiles: Similar to ${similarTargetPlayer.name}`}
        >
          <div className="space-y-4 font-mono text-xs">
            <p className="text-[#87958B]">
              Calculated via scikit-learn k-NN cosine distance across 15+ normalized per-90 metrics.
            </p>

            {loadingSimilar ? (
              <LoadingSpinner message="Searching metric vector space..." />
            ) : similarPlayers && similarPlayers.length > 0 ? (
              <div className="space-y-2">
                {similarPlayers.map((sim) => (
                  <div
                    key={sim.player_id}
                    className="p-3 bg-[#080F0B] border border-[#1D3025] rounded flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/players/${sim.player_id}`}
                          className="font-bold hover:text-emerald-400"
                        >
                          {sim.player_name}
                        </Link>
                        <PositionBadge position={sim.primary_position} />
                        <span className="text-[11px] text-[#87958B]">{sim.nationality}</span>
                      </div>
                      <div className="text-[10px] text-[#87958B] mt-1">
                        {sim.shared_traits.slice(0, 2).join(" • ")}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-emerald-400">{sim.similarity_score}%</span>
                      <div className="text-[10px] text-[#87958B]">Cosine Match</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-[#87958B]">
                No similar candidates found with sufficient match minutes.
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowSimilarModal(false)}
                className="px-3 py-1.5 bg-[#080F0B] border border-[#1D3025] text-[#E8EDE9] rounded"
              >
                Close
              </button>
            </div>
          </div>
        </ModalDialog>
      )}
    </div>
  );
};
