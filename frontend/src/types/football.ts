export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface Player {
  id: string;
  external_id?: string;
  name: string;
  birth_date?: string;
  nationality?: string;
  preferred_foot?: string;
  height?: number;
  primary_position?: string;
}

export interface PlayerAggregatedStats {
  matches_played: number;
  starts: number;
  sub_appearances: number;
  total_minutes: number;
  goals: number;
  assists: number;
  shots: number;
  shots_on_target: number;
  passes_attempted: number;
  passes_completed: number;
  pass_completion_pct: number;
  key_passes: number;
  tackles: number;
  interceptions: number;
  clearances: number;
  aerials_won: number;
  dribbles_completed: number;
  duels_won: number;
  touches: number;
  total_xg: number;
  total_xa: number;
  xg_per_90: number;
  xa_per_90: number;
  goals_per_90: number;
  assists_per_90: number;
  key_passes_per_90: number;
  tackles_per_90: number;
  interceptions_per_90: number;
}

export interface Team {
  id: string;
  external_id?: string;
  name: string;
  country?: string;
  gender?: string;
}

export interface PlayerDetail extends Player {
  appearances_count: number;
  total_minutes: number;
  teams: Team[];
  aggregated_stats?: PlayerAggregatedStats;
}

export interface TeamDetail extends Team {
  matches_count: number;
  players_count: number;
  players: Player[];
}

export interface Competition {
  id: string;
  external_id?: string;
  name: string;
  country?: string;
  gender?: string;
}

export interface Season {
  id: string;
  external_id?: string;
  competition_id: string;
  name: string;
  start_year?: number;
  end_year?: number;
}

export interface Match {
  id: string;
  external_id?: string;
  competition_id: string;
  season_id: string;
  home_team_id: string;
  away_team_id: string;
  match_date: string;
  match_datetime?: string;
  home_score?: number;
  away_score?: number;
  match_status?: string;
  home_team?: Team;
  away_team?: Team;
}

export interface MatchDetail extends Match {
  competition?: Competition;
  season?: Season;
  match_metadata?: Record<string, unknown>;
}

export interface PlayerMatchStats {
  id: string;
  match_id: string;
  team_id: string;
  minutes_played: number;
  goals: number;
  assists: number;
  shots: number;
  shots_on_target: number;
  passes_attempted: number;
  passes_completed: number;
  key_passes: number;
  tackles: number;
  interceptions: number;
  clearances: number;
  fouls_committed: number;
  fouls_won: number;
  yellow_cards: number;
  red_cards: number;
  aerials_won: number;
  dribbles_completed: number;
  duels_won: number;
  touches: number;
  xg?: number;
  xa?: number;
  detailed_stats?: Record<string, unknown>;
  match?: Match;
}
