import type { Player } from "./football";

export interface ScoutingReport {
  id: string;
  player_id: string;
  scout_name?: string;
  position_assessed?: string;
  technical_rating?: number;
  tactical_rating?: number;
  physical_rating?: number;
  mental_rating?: number;
  overall_rating?: number;
  strengths?: string[];
  weaknesses?: string[];
  written_observations?: string;
  assessment_date: string;
  created_at: string;
  updated_at: string;
}

export interface ScoutingReportCreate {
  scout_name?: string;
  position_assessed?: string;
  technical_rating?: number;
  tactical_rating?: number;
  physical_rating?: number;
  mental_rating?: number;
  overall_rating?: number;
  strengths?: string[];
  weaknesses?: string[];
  written_observations?: string;
  assessment_date?: string;
}

export interface ShortlistPlayer {
  id: string;
  shortlist_id: string;
  player_id: string;
  added_date: string;
  notes?: string;
  recruitment_status: string;
  player?: Player;
}

export interface Shortlist {
  id: string;
  name: string;
  description?: string;
  owner?: string;
  created_at: string;
  updated_at: string;
  player_count: number;
}

export interface ShortlistDetail extends Shortlist {
  players: ShortlistPlayer[];
}

export interface ShortlistCreate {
  name: string;
  description?: string;
  owner?: string;
}

export interface ShortlistPlayerCreate {
  player_id: string;
  notes?: string;
  recruitment_status: string;
}
