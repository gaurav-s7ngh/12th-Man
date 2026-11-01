import sys
import os
sys.path.insert(0, os.path.abspath("."))

from app.db.session import SessionLocal
from sqlalchemy import text

db = SessionLocal()

print("--- TESTING CLEANUP IN A TRANSACTION WITH ROLLBACK ---")
trans = db.begin()

try:
    euro_comp = db.execute(text("SELECT id, name FROM competitions WHERE name ILIKE '%Euro%'")).fetchone()
    bld_comp = db.execute(text("SELECT id, name FROM competitions WHERE name ILIKE '%Bundesliga%'")).fetchone()

    # 1. Re-link Euro-only scouting reports to Kevin Trapp (Bundesliga GK) / Florian Wirtz
    trapp = db.execute(text("SELECT id FROM players WHERE name ILIKE '%Kevin Trapp%'")).scalar()
    wirtz = db.execute(text("SELECT id FROM players WHERE name ILIKE '%Florian Wirtz%'")).scalar()
    print(f"Trapp ID: {trapp}, Wirtz ID: {wirtz}")

    # Re-link Ramsdale (GK) reports to Trapp, Bernardo Silva to Wirtz
    res1 = db.execute(text("""
        UPDATE scouting_reports 
        SET player_id = :trapp_id, 
            written_observations = '[Preserved from Euro target Aaron Ramsdale] ' || COALESCE(written_observations, '')
        WHERE player_id IN (SELECT id FROM players WHERE name ILIKE '%Ramsdale%')
    """), {"trapp_id": trapp})
    print(f"Scouting reports re-linked (Ramsdale -> Trapp): {res1.rowcount}")

    res2 = db.execute(text("""
        UPDATE scouting_reports 
        SET player_id = :wirtz_id, 
            written_observations = '[Preserved from Euro target Bernardo Silva] ' || COALESCE(written_observations, '')
        WHERE player_id IN (SELECT id FROM players WHERE name ILIKE '%Bernardo%Silva%')
    """), {"wirtz_id": wirtz})
    print(f"Scouting reports re-linked (Bernardo -> Wirtz): {res2.rowcount}")

    # Re-link shortlist players
    res3 = db.execute(text("""
        UPDATE shortlist_players 
        SET player_id = :trapp_id, 
            notes = '[Preserved from Euro target] ' || COALESCE(notes, '')
        WHERE player_id IN (SELECT id FROM players WHERE name ILIKE '%Ramsdale%')
    """), {"trapp_id": trapp})
    print(f"Shortlist players re-linked (Ramsdale -> Trapp): {res3.rowcount}")

    # 2. Delete Euro Data Sources
    res_ds = db.execute(text("""
        DELETE FROM data_sources 
        WHERE dataset_identifier ILIKE '%Euro%'
    """))
    print(f"Data sources deleted: {res_ds.rowcount}")

    # 3. Delete Euro Competition (this cascades to seasons, matches, player_match_stats, player_appearances, match_events!)
    res_comp = db.execute(text("DELETE FROM competitions WHERE id = :cid"), {"cid": euro_comp[0]})
    print(f"Euro competition deleted: {res_comp.rowcount}")

    # 4. Delete Euro-only teams (teams not in any remaining matches)
    res_teams = db.execute(text("""
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
    print(f"Euro-only teams deleted: {res_teams.rowcount}")

    # 5. Delete Euro-only players (players with no appearances in remaining matches)
    res_players = db.execute(text("""
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
    print(f"Orphaned Euro players deleted: {res_players.rowcount}")

    # Verify counts in transaction
    print("\n--- POST-CLEANUP SIMULATED COUNTS ---")
    for t in ['competitions', 'seasons', 'matches', 'teams', 'players', 'player_appearances', 'player_match_stats', 'match_events', 'scouting_reports', 'shortlist_players', 'shortlists', 'clubs', 'recruitment_needs']:
        cnt = db.execute(text(f'SELECT count(*) FROM "{t}"')).scalar()
        print(f"{t}: {cnt}")

    print("\nSUCCESS! Simulation completed with zero errors.")
except Exception as e:
    print(f"Error during simulation: {e}")
    raise
finally:
    trans.rollback()
    print("Transaction rolled back cleanly.")
    db.close()
