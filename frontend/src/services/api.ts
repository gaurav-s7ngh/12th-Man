import type {
  AvailableClubItem,
  Club,
  CandidateRecommendation,
  Competition,
  Match,
  MatchDetail,
  PaginatedResponse,
  Player,
  PlayerDetail,
  PlayerMatchStats,
  PlayerAggregatedStats,
  RecruitmentMapResponse,
  RecruitmentNeed,
  Season,
  SimilarPlayer,
  SquadArchetypeGaps,
  SquadAssessment,
  TacticalArchetype,
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

  if (response.status === 204) {
    return null as T;
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}

export const api = {
  // Health
  getHealth: () => request<{ status: string; service: string }>("/api/v1/health"),
  getDbHealth: () => request<{ status: string; database: string }>("/api/v1/db-health"),

  // Club & Squad Intelligence
  getClub: () => request<Club>("/api/v1/club"),
  getClubById: (clubId: string) => request<Club>(`/api/v1/club?club_id=${clubId}`),
  getAvailableClubs: () => request<AvailableClubItem[]>("/api/v1/club/available"),
  selectActiveClub: (targetId: string) =>
    request<Club>(`/api/v1/club/select/${targetId}`, { method: "POST" }),
  updateClub: (data: Partial<Club>) =>
    request<Club>("/api/v1/club", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  getSquadAssessment: () => request<SquadAssessment>("/api/v1/club/squad-assessment"),
  getSquadAssessmentForClub: (clubId?: string, teamId?: string) => {
    const q = new URLSearchParams();
    if (clubId) q.append("club_id", clubId);
    if (teamId) q.append("team_id", teamId);
    const qs = q.toString() ? `?${q.toString()}` : "";
    return request<SquadAssessment>(`/api/v1/club/squad-assessment${qs}`);
  },
  getRecruitmentNeeds: () => request<RecruitmentNeed[]>("/api/v1/club/recruitment-needs"),
  getRecruitmentNeedsForClub: (clubId: string) =>
    request<RecruitmentNeed[]>(`/api/v1/club/recruitment-needs?club_id=${clubId}`),
  createRecruitmentNeed: (data: Partial<RecruitmentNeed>) =>
    request<RecruitmentNeed>("/api/v1/club/recruitment-needs", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateRecruitmentNeed: (needId: string, data: Partial<RecruitmentNeed>) =>
    request<RecruitmentNeed>(`/api/v1/club/recruitment-needs/${needId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteRecruitmentNeed: (needId: string) =>
    request<void>(`/api/v1/club/recruitment-needs/${needId}`, {
      method: "DELETE",
    }),

  // Recruitment Discovery
  getSupportedRoles: () => request<Record<string, unknown>>("/api/v1/recruitment/roles"),
  discoverCandidates: (params?: {
    role_profile?: string;
    position?: string;
    preferred_foot?: string;
    min_age?: number;
    max_age?: number;
    competition_id?: string;
    season_id?: string;
    min_minutes?: number;
    min_fit_score?: number;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.role_profile) q.append("role_profile", params.role_profile);
    if (params?.position) q.append("position", params.position);
    if (params?.preferred_foot) q.append("preferred_foot", params.preferred_foot);
    if (params?.min_age !== undefined) q.append("min_age", params.min_age.toString());
    if (params?.max_age !== undefined) q.append("max_age", params.max_age.toString());
    if (params?.competition_id) q.append("competition_id", params.competition_id);
    if (params?.season_id) q.append("season_id", params.season_id);
    if (params?.min_minutes !== undefined) q.append("min_minutes", params.min_minutes.toString());
    if (params?.min_fit_score !== undefined) q.append("min_fit_score", params.min_fit_score.toString());
    if (params?.limit) q.append("limit", params.limit.toString());
    return request<CandidateRecommendation[]>(`/api/v1/recruitment/discover?${q.toString()}`);
  },

  getRecruitmentMap: (params?: {
    role_profile?: string;
    need_id?: string;
    club_id?: string;
    position?: string;
    preferred_foot?: string;
    min_age?: number;
    max_age?: number;
    min_minutes?: number;
    competition_id?: string;
    season_id?: string;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.role_profile) q.append("role_profile", params.role_profile);
    if (params?.need_id) q.append("need_id", params.need_id);
    if (params?.club_id) q.append("club_id", params.club_id);
    if (params?.position) q.append("position", params.position);
    if (params?.preferred_foot) q.append("preferred_foot", params.preferred_foot);
    if (params?.min_age !== undefined) q.append("min_age", params.min_age.toString());
    if (params?.max_age !== undefined) q.append("max_age", params.max_age.toString());
    if (params?.min_minutes !== undefined) q.append("min_minutes", params.min_minutes.toString());
    if (params?.competition_id) q.append("competition_id", params.competition_id);
    if (params?.season_id) q.append("season_id", params.season_id);
    if (params?.limit) q.append("limit", params.limit.toString());
    return request<RecruitmentMapResponse>(`/api/v1/recruitment/map?${q.toString()}`);
  },

  // Machine Learning & Similarity
  getSimilarPlayers: (playerId: string, k: number = 6) =>
    request<SimilarPlayer[]>(`/api/v1/ml/similar/${playerId}?k=${k}`),
  getArchetypes: () => request<TacticalArchetype[]>("/api/v1/ml/archetypes"),
  getPlayerArchetype: (playerId: string) =>
    request<{
      player_id: string;
      player_name: string;
      cluster_id: number;
      archetype_label: string;
      description: string;
      key_strengths: string[];
    }>(`/api/v1/ml/archetype/${playerId}`),
  getSquadArchetypeGaps: (teamId?: string) => {
    const q = teamId ? `?team_id=${teamId}` : "";
    return request<SquadArchetypeGaps>(`/api/v1/ml/squad-gaps${q}`);
  },

  // Players
  getPlayers: (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    position?: string;
    role?: string;
    preferred_foot?: string;
    nationality?: string;
    team_id?: string;
    competition_id?: string;
    season_id?: string;
    min_minutes?: number;
    max_minutes?: number;
    min_age?: number;
    max_age?: number;
    sort_by?: string;
    sort_order?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.page) q.append("page", params.page.toString());
    if (params?.page_size) q.append("page_size", params.page_size.toString());
    if (params?.search) q.append("search", params.search);
    if (params?.position) q.append("position", params.position);
    if (params?.role) q.append("role", params.role);
    if (params?.preferred_foot) q.append("preferred_foot", params.preferred_foot);
    if (params?.nationality) q.append("nationality", params.nationality);
    if (params?.team_id) q.append("team_id", params.team_id);
    if (params?.competition_id) q.append("competition_id", params.competition_id);
    if (params?.season_id) q.append("season_id", params.season_id);
    if (params?.min_minutes !== undefined) q.append("min_minutes", params.min_minutes.toString());
    if (params?.max_minutes !== undefined) q.append("max_minutes", params.max_minutes.toString());
    if (params?.min_age !== undefined) q.append("min_age", params.min_age.toString());
    if (params?.max_age !== undefined) q.append("max_age", params.max_age.toString());
    if (params?.sort_by) q.append("sort_by", params.sort_by);
    if (params?.sort_order) q.append("sort_order", params.sort_order);
    return request<PaginatedResponse<Player>>(`/api/v1/players?${q.toString()}`);
  },

  getPlayer: (playerId: string, competition_id?: string, season_id?: string) => {
    const q = new URLSearchParams();
    if (competition_id) q.append("competition_id", competition_id);
    if (season_id) q.append("season_id", season_id);
    const qs = q.toString() ? `?${q.toString()}` : "";
    return request<PlayerDetail>(`/api/v1/players/${playerId}${qs}`);
  },

  getPlayerStats: (playerId: string, competition_id?: string, season_id?: string) => {
    const q = new URLSearchParams();
    if (competition_id) q.append("competition_id", competition_id);
    if (season_id) q.append("season_id", season_id);
    const qs = q.toString() ? `?${q.toString()}` : "";
    return request<{ player_id: string; match_stats: PlayerMatchStats[]; aggregated: PlayerAggregatedStats | null }>(
      `/api/v1/players/${playerId}/statistics${qs}`
    );
  },

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

  // Competitions & Seasons
  getCompetitions: () => request<Competition[]>("/api/v1/competitions"),
  getSeasons: () => request<Season[]>("/api/v1/seasons"),

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
  updateShortlistPlayer: (
    shortlistId: string,
    entryId: string,
    data: { recruitment_status?: string; notes?: string }
  ) =>
    request<ShortlistPlayer>(`/api/v1/shortlists/${shortlistId}/players/${entryId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  advanceShortlistPlayer: (shortlistId: string, entryId: string) =>
    request<ShortlistPlayer>(`/api/v1/shortlists/${shortlistId}/players/${entryId}/advance`, {
      method: "POST",
    }),
  removePlayerFromShortlist: (shortlistId: string, entryId: string) =>
    request<void>(`/api/v1/shortlists/${shortlistId}/players/${entryId}`, {
      method: "DELETE",
    }),
  deleteShortlist: (shortlistId: string) =>
    request<void>(`/api/v1/shortlists/${shortlistId}`, {
      method: "DELETE",
    }),
};
