import type {
  Competition,
  Match,
  MatchDetail,
  PaginatedResponse,
  Player,
  PlayerDetail,
  PlayerMatchStats,
  PlayerAggregatedStats,
  Team,
  TeamDetail,
} from "../types/football";
import type {
  ScoutingReport,
  ScoutingReportCreate,
  Shortlist,
  ShortlistCreate,
  ShortlistDetail,
  ShortlistPlayer,
  ShortlistPlayerCreate,
} from "../types/scouting";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`API Error ${response.status}: ${errorBody || response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Health
  getHealth: () => request<{ status: string; service: string }>("/api/v1/health"),
  getDbHealth: () => request<{ status: string; database: string }>("/api/v1/db-health"),

  // Players
  getPlayers: (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    position?: string;
    nationality?: string;
    team_id?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.page) q.append("page", params.page.toString());
    if (params?.page_size) q.append("page_size", params.page_size.toString());
    if (params?.search) q.append("search", params.search);
    if (params?.position) q.append("position", params.position);
    if (params?.nationality) q.append("nationality", params.nationality);
    if (params?.team_id) q.append("team_id", params.team_id);
    return request<PaginatedResponse<Player>>(`/api/v1/players?${q.toString()}`);
  },

  getPlayer: (playerId: string) => request<PlayerDetail>(`/api/v1/players/${playerId}`),

  getPlayerStats: (playerId: string) =>
    request<{ player_id: string; match_stats: PlayerMatchStats[]; aggregated: PlayerAggregatedStats | null }>(
      `/api/v1/players/${playerId}/statistics`
    ),

  getPlayerScoutingReports: (playerId: string) =>
    request<ScoutingReport[]>(`/api/v1/players/${playerId}/scouting-reports`),

  createPlayerScoutingReport: (playerId: string, data: ScoutingReportCreate) =>
    request<ScoutingReport>(`/api/v1/players/${playerId}/scouting-reports`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Teams
  getTeams: () => request<Team[]>("/api/v1/teams"),
  getTeam: (teamId: string) => request<TeamDetail>(`/api/v1/teams/${teamId}`),

  // Competitions
  getCompetitions: () => request<Competition[]>("/api/v1/competitions"),

  // Matches
  getMatches: (params?: {
    page?: number;
    page_size?: number;
    competition_id?: string;
    season_id?: string;
    team_id?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.page) q.append("page", params.page.toString());
    if (params?.page_size) q.append("page_size", params.page_size.toString());
    if (params?.competition_id) q.append("competition_id", params.competition_id);
    if (params?.season_id) q.append("season_id", params.season_id);
    if (params?.team_id) q.append("team_id", params.team_id);
    return request<PaginatedResponse<Match>>(`/api/v1/matches?${q.toString()}`);
  },

  getMatch: (matchId: string) => request<MatchDetail>(`/api/v1/matches/${matchId}`),

  // Shortlists
  getShortlists: () => request<Shortlist[]>("/api/v1/shortlists"),
  createShortlist: (data: ShortlistCreate) =>
    request<Shortlist>("/api/v1/shortlists", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getShortlist: (shortlistId: string) =>
    request<ShortlistDetail>(`/api/v1/shortlists/${shortlistId}`),
  addPlayerToShortlist: (shortlistId: string, data: ShortlistPlayerCreate) =>
    request<ShortlistPlayer>(`/api/v1/shortlists/${shortlistId}/players`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
