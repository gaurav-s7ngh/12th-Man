"""remove_euro_2024_dataset_standardise_bundesliga

Revision ID: e7b1a4c9d82f
Revises: 92d7746b9e1c
Create Date: 2026-11-02 03:45:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision: str = 'e7b1a4c9d82f'
down_revision: Union[str, None] = '92d7746b9e1c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # 1. Re-link Euro-only scouting reports to active Bundesliga players to preserve user scouting data
    trapp = conn.execute(text("SELECT id FROM players WHERE name ILIKE '%Kevin Trapp%' LIMIT 1")).scalar()
    wirtz = conn.execute(text("SELECT id FROM players WHERE name ILIKE '%Florian Wirtz%' LIMIT 1")).scalar()

    if trapp:
        conn.execute(text("""
            UPDATE scouting_reports 
            SET player_id = :trapp_id, 
                written_observations = '[Preserved from Euro target] ' || COALESCE(written_observations, '')
            WHERE player_id IN (SELECT id FROM players WHERE name ILIKE '%Ramsdale%')
        """), {"trapp_id": trapp})

        conn.execute(text("""
            UPDATE shortlist_players 
            SET player_id = :trapp_id, 
                notes = '[Preserved from Euro target] ' || COALESCE(notes, '')
            WHERE player_id IN (SELECT id FROM players WHERE name ILIKE '%Ramsdale%')
        """), {"trapp_id": trapp})

    if wirtz:
        conn.execute(text("""
            UPDATE scouting_reports 
            SET player_id = :wirtz_id, 
                written_observations = '[Preserved from Euro target] ' || COALESCE(written_observations, '')
            WHERE player_id IN (SELECT id FROM players WHERE name ILIKE '%Bernardo%Silva%')
        """), {"wirtz_id": wirtz})

    # 2. Delete Euro Data Sources
    conn.execute(text("""
        DELETE FROM data_sources 
        WHERE dataset_identifier ILIKE '%Euro%'
    """))

    # 3. Delete Euro Competition (cascades to seasons, matches, player_match_stats, player_appearances, match_events)
    conn.execute(text("""
        DELETE FROM competitions 
        WHERE name ILIKE '%Euro%'
    """))

    # 4. Delete Euro-only national teams unreferenced by remaining matches or clubs
    conn.execute(text("""
        DELETE FROM teams 
        WHERE id NOT IN (
            SELECT home_team_id FROM matches
            UNION
            SELECT away_team_id FROM matches
        )
        AND id NOT IN (
            SELECT linked_team_id FROM clubs WHERE linked_team_id IS NOT NULL
        )
    """))

    # 5. Delete orphaned Euro-only players with no appearances in remaining Bundesliga matches
    conn.execute(text("""
        DELETE FROM players 
        WHERE id NOT IN (
            SELECT DISTINCT player_id FROM player_appearances
        )
        AND id NOT IN (
            SELECT DISTINCT player_id FROM player_match_stats
        )
        AND id NOT IN (
            SELECT DISTINCT player_id FROM scouting_reports
        )
        AND id NOT IN (
            SELECT DISTINCT player_id FROM shortlist_players
        )
    """))


def downgrade() -> None:
    # Notice: Re-ingestion script `scripts/ingest_statsbomb.py` can restore Euro 2024 if needed.
    pass
