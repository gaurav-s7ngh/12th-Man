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
  // Enriched fields returned by the list_players query
  total_minutes?: number;
  current_team?: string;
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

export interface CompetitionBreakdown {
  competition_id: string;
  competition_name: string;
  season_id: string;
  season_name: string;
  matches: number;
  minutes: number;
  goals: number;
  assists: number;
  xg: number;
  sample_confidence: string;
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
  competition_breakdowns?: CompetitionBreakdown[];
  sample_confidence?: string;
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

// Club & Recruitment Intelligence Types
export interface AvailableClubItem {
  id?: string;
  team_id?: string;
  name: string;
  manager_name?: string;
  primary_formation: string;
  is_active: boolean;
  squad_size: number;
}

export interface Club {
  id: string;
  name: string;
  linked_team_id?: string;
  is_active?: boolean;
  manager_name?: string;
  primary_formation: string;
  secondary_formation?: string;
  playing_style: Record<string, string>;
  tactical_identity: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  linked_team?: Team;
  recruitment_needs?: RecruitmentNeed[];
}

export interface RecruitmentNeed {
  id: string;
  club_id: string;
  title: string;
  position: string;
  role_profile: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  target_age_min?: number;
  target_age_max?: number;
  target_metrics: Record<string, number>;
  status: "Active" | "Evaluating" | "Shortlisted" | "Signed" | "Closed";
  rationale?: string;
  shortlist_id?: string;
  created_at: string;
  updated_at: string;
}

export interface SquadPlayerProfile {
  id: string;
  name: string;
  primary_position: string;
  birth_date?: string;
  age?: number;
  nationality?: string;
  total_minutes: number;
  starts: number;
  sub_appearances: number;
  goals: number;
  assists: number;
  xg: number;
  sample_confidence: string;
  tactical_archetype?: string;
}

export interface PositionDepthItem {
  category: string;
  target_slots: number;
  current_count: number;
  status: "Adequate" | "Thin" | "Critical Void" | "Surplus";
  players: SquadPlayerProfile[];
}

export interface SquadAssessment {
  club_id: string;
  club_name: string;
  linked_team_name?: string;
  total_squad_size: number;
  average_age: number;
  depth_categories: PositionDepthItem[];
  strengths: string[];
  vulnerabilities: string[];
  recommended_recruitment_gaps: Array<{
    position: string;
    urgency: string;
    reason: string;
  }>;
}

export interface CandidateRecommendation {
  id: string;
  name: string;
  primary_position: string;
  nationality?: string;
  age?: number;
  total_minutes: number;
  sample_confidence: string;
  fit_score: number;
  role_profile: string;
  metric_breakdown: Record<string, { value: number; percentile: number; weight: number }>;
  strengths: string[];
  risk_factors: string[];
}

export interface SimilarPlayer {
  player_id: string;
  player_name: string;
  primary_position: string;
  position_cohort: string;
  nationality?: string;
  total_minutes: number;
  similarity_score: number;
  shared_traits: string[];
  key_divergence?: string;
}

export interface TacticalArchetype {
  cluster_id: number;
  label: string;
  description: string;
  leading_kpis: string[];
  player_count: number;
  percentage_of_pool: number;
  notable_players: Array<{ id: string; name: string; team?: string }>;
}

export interface SquadArchetypeGaps {
  squad_evaluated_count: number;
  archetype_distribution: Record<string, number>;
  archetype_roster: Record<string, string[]>;
  tactical_vulnerabilities: Array<{
    archetype: string;
    status: string;
    tactical_impact: string;
  }>;
}

export interface RecruitmentMapCandidate {
  id: string;
  name: string;
  current_club: string;
  primary_position: string;
  nationality?: string;
  age?: number;
  total_minutes: number;
  sample_confidence: string;
  profile_fit: number;
  squad_complementarity: number;
  quadrant: "priority_target" | "talented_specialist" | "tactical_gap_filler" | "low_priority";
  quadrant_label: string;
  is_squad_member: boolean;
  role_profile: string;
  strategic_explanation: string;
  metric_breakdown: Record<string, { value: number; percentile: number; weight: number }>;
  strengths: string[];
  weaknesses: string[];
}

export interface RecruitmentMapResponse {
  role_profile: string;
  club_name: string;
  tactical_system: string;
  squad_configured: boolean;
  squad_complementarity_available: boolean;
  total_candidates: number;
  priority_candidates_count: number;
  role_weights: Record<string, number>;
  active_need_title?: string;
  candidates: RecruitmentMapCandidate[];
}
