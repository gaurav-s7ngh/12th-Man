-- 12th Man Database Schema
-- PostgreSQL 18 Compatible
-- Football Scouting, Analytics and Recruitment Intelligence Platform

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Data Sources Table
CREATE TABLE IF NOT EXISTS data_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_name VARCHAR(50) NOT NULL,
    dataset_identifier VARCHAR(100) NOT NULL,
    import_timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(30) NOT NULL DEFAULT 'completed',
    source_provenance JSONB,
    records_ingested JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_data_sources_provider_name ON data_sources (provider_name);

-- Competitions Table
CREATE TABLE IF NOT EXISTS competitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id VARCHAR(100) UNIQUE,
    name VARCHAR(150) NOT NULL,
    country VARCHAR(100),
    gender VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_competitions_external_id ON competitions (external_id);
CREATE INDEX IF NOT EXISTS ix_competitions_name ON competitions (name);

-- Seasons Table
CREATE TABLE IF NOT EXISTS seasons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id VARCHAR(100),
    competition_id UUID NOT NULL REFERENCES competitions (id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    start_year INTEGER,
    end_year INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_competition_season_name UNIQUE (competition_id, name)
);
CREATE INDEX IF NOT EXISTS ix_seasons_competition_id ON seasons (competition_id);
CREATE INDEX IF NOT EXISTS ix_seasons_external_id ON seasons (external_id);

-- Teams Table
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id VARCHAR(100) UNIQUE,
    name VARCHAR(150) NOT NULL,
    country VARCHAR(100),
    gender VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_teams_external_id ON teams (external_id);
CREATE INDEX IF NOT EXISTS ix_teams_name ON teams (name);

-- Players Table
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id VARCHAR(100) UNIQUE,
    name VARCHAR(150) NOT NULL,
    birth_date DATE,
    nationality VARCHAR(100),
    preferred_foot VARCHAR(20),
    height INTEGER,
    primary_position VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_players_external_id ON players (external_id);
CREATE INDEX IF NOT EXISTS ix_players_name ON players (name);
CREATE INDEX IF NOT EXISTS ix_players_nationality ON players (nationality);
CREATE INDEX IF NOT EXISTS ix_players_primary_position ON players (primary_position);

-- Matches Table
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id VARCHAR(100) UNIQUE,
    competition_id UUID NOT NULL REFERENCES competitions (id) ON DELETE CASCADE,
    season_id UUID NOT NULL REFERENCES seasons (id) ON DELETE CASCADE,
    home_team_id UUID NOT NULL REFERENCES teams (id) ON DELETE RESTRICT,
    away_team_id UUID NOT NULL REFERENCES teams (id) ON DELETE RESTRICT,
    match_date DATE NOT NULL,
    match_datetime TIMESTAMPTZ,
    home_score INTEGER,
    away_score INTEGER,
    match_status VARCHAR(50),
    match_metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_matches_competition_id ON matches (competition_id);
CREATE INDEX IF NOT EXISTS ix_matches_season_id ON matches (season_id);
CREATE INDEX IF NOT EXISTS ix_matches_home_team_id ON matches (home_team_id);
CREATE INDEX IF NOT EXISTS ix_matches_away_team_id ON matches (away_team_id);
CREATE INDEX IF NOT EXISTS ix_matches_match_date ON matches (match_date);

-- Player Appearances Table
CREATE TABLE IF NOT EXISTS player_appearances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES players (id) ON DELETE CASCADE,
    match_id UUID NOT NULL REFERENCES matches (id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams (id) ON DELETE RESTRICT,
    is_starter BOOLEAN NOT NULL DEFAULT FALSE,
    is_substitute BOOLEAN NOT NULL DEFAULT FALSE,
    minutes_played INTEGER,
    shirt_number INTEGER,
    position VARCHAR(50),
    external_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_player_match_team_appearance UNIQUE (player_id, match_id, team_id)
);
CREATE INDEX IF NOT EXISTS ix_player_appearances_player_id ON player_appearances (player_id);
CREATE INDEX IF NOT EXISTS ix_player_appearances_match_id ON player_appearances (match_id);
CREATE INDEX IF NOT EXISTS ix_player_appearances_team_id ON player_appearances (team_id);

-- Match Events Table
CREATE TABLE IF NOT EXISTS match_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id VARCHAR(100) UNIQUE NOT NULL,
    match_id UUID NOT NULL REFERENCES matches (id) ON DELETE CASCADE,
    player_id UUID REFERENCES players (id) ON DELETE SET NULL,
    team_id UUID REFERENCES teams (id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    period INTEGER,
    timestamp VARCHAR(20),
    minute INTEGER,
    second INTEGER,
    location_x FLOAT,
    location_y FLOAT,
    attributes JSONB,
    raw_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_match_events_match_id ON match_events (match_id);
CREATE INDEX IF NOT EXISTS ix_match_events_player_id ON match_events (player_id);
CREATE INDEX IF NOT EXISTS ix_match_events_team_id ON match_events (team_id);
CREATE INDEX IF NOT EXISTS ix_match_events_event_type ON match_events (event_type);
CREATE INDEX IF NOT EXISTS ix_match_events_minute ON match_events (minute);
CREATE INDEX IF NOT EXISTS ix_match_events_match_event_type ON match_events (match_id, event_type);
CREATE INDEX IF NOT EXISTS ix_match_events_player_event_type ON match_events (player_id, event_type);

-- Player Match Stats Table
CREATE TABLE IF NOT EXISTS player_match_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES players (id) ON DELETE CASCADE,
    match_id UUID NOT NULL REFERENCES matches (id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams (id) ON DELETE RESTRICT,
    minutes_played INTEGER NOT NULL DEFAULT 0,
    goals INTEGER NOT NULL DEFAULT 0,
    assists INTEGER NOT NULL DEFAULT 0,
    shots INTEGER NOT NULL DEFAULT 0,
    shots_on_target INTEGER NOT NULL DEFAULT 0,
    passes_attempted INTEGER NOT NULL DEFAULT 0,
    passes_completed INTEGER NOT NULL DEFAULT 0,
    key_passes INTEGER NOT NULL DEFAULT 0,
    tackles INTEGER NOT NULL DEFAULT 0,
    interceptions INTEGER NOT NULL DEFAULT 0,
    clearances INTEGER NOT NULL DEFAULT 0,
    fouls_committed INTEGER NOT NULL DEFAULT 0,
    fouls_won INTEGER NOT NULL DEFAULT 0,
    yellow_cards INTEGER NOT NULL DEFAULT 0,
    red_cards INTEGER NOT NULL DEFAULT 0,
    aerials_won INTEGER NOT NULL DEFAULT 0,
    dribbles_completed INTEGER NOT NULL DEFAULT 0,
    duels_won INTEGER NOT NULL DEFAULT 0,
    touches INTEGER NOT NULL DEFAULT 0,
    xg FLOAT,
    xa FLOAT,
    detailed_stats JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_player_match_stats UNIQUE (player_id, match_id)
);
CREATE INDEX IF NOT EXISTS ix_player_match_stats_player_id ON player_match_stats (player_id);
CREATE INDEX IF NOT EXISTS ix_player_match_stats_match_id ON player_match_stats (match_id);
CREATE INDEX IF NOT EXISTS ix_player_match_stats_team_id ON player_match_stats (team_id);

-- Scouting Reports Table
CREATE TABLE IF NOT EXISTS scouting_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES players (id) ON DELETE CASCADE,
    scout_name VARCHAR(100),
    position_assessed VARCHAR(50),
    technical_rating FLOAT,
    tactical_rating FLOAT,
    physical_rating FLOAT,
    mental_rating FLOAT,
    overall_rating FLOAT,
    strengths JSONB,
    weaknesses JSONB,
    written_observations TEXT,
    assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_scouting_reports_player_id ON scouting_reports (player_id);

-- Shortlists Table
CREATE TABLE IF NOT EXISTS shortlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    description TEXT,
    owner VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Shortlist Players Table
CREATE TABLE IF NOT EXISTS shortlist_players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shortlist_id UUID NOT NULL REFERENCES shortlists (id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players (id) ON DELETE CASCADE,
    added_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    recruitment_status VARCHAR(50) NOT NULL DEFAULT 'Target',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_shortlist_player UNIQUE (shortlist_id, player_id)
);
CREATE INDEX IF NOT EXISTS ix_shortlist_players_shortlist_id ON shortlist_players (shortlist_id);
CREATE INDEX IF NOT EXISTS ix_shortlist_players_player_id ON shortlist_players (player_id);

-- Clubs Table (Our Managed Club / Squad Setup)
CREATE TABLE IF NOT EXISTS clubs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    linked_team_id UUID REFERENCES teams (id) ON DELETE SET NULL,
    manager_name VARCHAR(100),
    primary_formation VARCHAR(20) NOT NULL DEFAULT '4-3-3',
    secondary_formation VARCHAR(20) DEFAULT '4-2-3-1',
    playing_style JSONB NOT NULL DEFAULT '{}'::jsonb,
    tactical_identity JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_clubs_name ON clubs (name);
CREATE INDEX IF NOT EXISTS ix_clubs_linked_team_id ON clubs (linked_team_id);

-- Recruitment Needs Table
CREATE TABLE IF NOT EXISTS recruitment_needs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID NOT NULL REFERENCES clubs (id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    position VARCHAR(50) NOT NULL,
    role_profile VARCHAR(100) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'High',
    target_age_min INTEGER,
    target_age_max INTEGER,
    target_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(30) NOT NULL DEFAULT 'Active',
    rationale TEXT,
    shortlist_id UUID REFERENCES shortlists (id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_recruitment_needs_club_id ON recruitment_needs (club_id);
CREATE INDEX IF NOT EXISTS ix_recruitment_needs_position ON recruitment_needs (position);
