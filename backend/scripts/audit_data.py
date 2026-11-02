import sys
from pathlib import Path

# Add backend to path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

import os
from sqlalchemy import create_engine, text
from app.core.config import settings

def run_audit():
    engine = create_engine(settings.DATABASE_URL)
    with engine.connect() as conn:
        print("=" * 60)
        print("12TH MAN — BUNDESLIGA DATASET INTEGRITY & QUALITY AUDIT")
        print("=" * 60)

        # 1. Total players and teams
        total_players = conn.execute(text("SELECT COUNT(*) FROM players")).scalar()
        total_teams = conn.execute(text("SELECT COUNT(*) FROM teams")).scalar()
        total_matches = conn.execute(text("SELECT COUNT(*) FROM matches")).scalar()
        total_events = conn.execute(text("SELECT COUNT(*) FROM match_events")).scalar()
        total_apps = conn.execute(text("SELECT COUNT(*) FROM player_appearances")).scalar()
        total_stats = conn.execute(text("SELECT COUNT(*) FROM player_match_stats")).scalar()

        print(f"Summary: {total_players} players | {total_teams} teams | {total_matches} matches | {total_events:,} events")
        print(f"Appearances: {total_apps} | Match stats rows: {total_stats}")

        # 2. Distinct positions
        pos_counts = conn.execute(text("SELECT primary_position, COUNT(*) FROM players GROUP BY primary_position ORDER BY count DESC")).fetchall()
        print("\nDistinct primary_position in players table:")
        for p, c in pos_counts:
            print(f"  {p!r:30}: {c}")

        # 3. Position in appearances
        app_pos_counts = conn.execute(text("SELECT position, COUNT(*) FROM player_appearances GROUP BY position ORDER BY count DESC")).fetchall()
        print("\nDistinct position in player_appearances:")
        for p, c in app_pos_counts:
            print(f"  {p!r:30}: {c}")

        # 4. Null/empty position in players
        null_pos = conn.execute(text("SELECT COUNT(*) FROM players WHERE primary_position IS NULL OR trim(primary_position) = ''")).scalar()
        print(f"\nPlayers with NULL or empty primary_position: {null_pos}")

        # 5. Duplicate names or external_ids
        dup_names = conn.execute(text("SELECT name, COUNT(*) FROM players GROUP BY name HAVING COUNT(*) > 1")).fetchall()
        print(f"Duplicate player names: {len(dup_names)} ({[r[0] for r in dup_names]})")
        dup_ext = conn.execute(text("SELECT external_id, COUNT(*) FROM players WHERE external_id IS NOT NULL GROUP BY external_id HAVING COUNT(*) > 1")).fetchall()
        print(f"Duplicate external_ids: {len(dup_ext)}")

        # 6. Preferred foot distribution
        foot_counts = conn.execute(text("SELECT preferred_foot, COUNT(*) FROM players GROUP BY preferred_foot ORDER BY count DESC")).fetchall()
        print("\nPreferred foot distribution:")
        for f, c in foot_counts:
            print(f"  {f!r:20}: {c}")

        # 7. Team associations (via appearances/match_stats)
        team_counts = conn.execute(text("""
            SELECT t.name, COUNT(DISTINCT pa.player_id) as player_count 
            FROM teams t 
            LEFT JOIN player_appearances pa ON pa.team_id = t.id 
            GROUP BY t.name 
            ORDER BY player_count DESC
        """)).fetchall()
        print("\nPlayers per team count (via appearances):")
        for t_name, c in team_counts:
            print(f"  {t_name:30}: {c}")

        # 8. Unassigned players (players with 0 appearances)
        unassigned_players = conn.execute(text("""
            SELECT COUNT(*) FROM players p
            WHERE NOT EXISTS (SELECT 1 FROM player_appearances pa WHERE pa.player_id = p.id)
        """)).scalar()
        print(f"Players with 0 appearances: {unassigned_players}")

        # 9. Minutes comparison: appearance vs aggregated stats
        diff_mins = conn.execute(text("""
            SELECT p.id, p.name, 
                   COALESCE(app.total_app_mins, 0) as app_mins,
                   COALESCE(stat.total_stat_mins, 0) as stat_mins
            FROM players p
            LEFT JOIN (
                SELECT player_id, SUM(minutes_played) as total_app_mins 
                FROM player_appearances GROUP BY player_id
            ) app ON app.player_id = p.id
            LEFT JOIN (
                SELECT player_id, SUM(minutes_played) as total_stat_mins 
                FROM player_match_stats GROUP BY player_id
            ) stat ON stat.player_id = p.id
            WHERE COALESCE(app.total_app_mins, 0) != COALESCE(stat.total_stat_mins, 0)
        """)).fetchall()
        print(f"\nMinutes discrepancy (Appearances vs MatchStats): {len(diff_mins)}")

        # 10. Substitution & minutes sanity: any appearances with negative or > 130 minutes?
        odd_mins = conn.execute(text("SELECT COUNT(*) FROM player_appearances WHERE minutes_played < 0 OR minutes_played > 130")).scalar()
        print(f"Appearances with abnormal minutes (<0 or >130): {odd_mins}")

        # 11. Duplicate appearances (same player, same match)
        dup_apps = conn.execute(text("""
            SELECT player_id, match_id, COUNT(*) 
            FROM player_appearances 
            GROUP BY player_id, match_id 
            HAVING COUNT(*) > 1
        """)).fetchall()
        print(f"Duplicate player appearances (same match & player): {len(dup_apps)}")

        # 12. Scouting reports and shortlists integrity
        reports_count = conn.execute(text("SELECT COUNT(*) FROM scouting_reports")).scalar()
        unlinked_reports = conn.execute(text("SELECT COUNT(*) FROM scouting_reports sr LEFT JOIN players p ON sr.player_id = p.id WHERE p.id IS NULL")).scalar()
        shortlists_count = conn.execute(text("SELECT COUNT(*) FROM shortlists")).scalar()
        shortlist_players = conn.execute(text("SELECT COUNT(*) FROM shortlist_players")).scalar()
        unlinked_sl_players = conn.execute(text("SELECT COUNT(*) FROM shortlist_players sp LEFT JOIN players p ON sp.player_id = p.id WHERE p.id IS NULL")).scalar()
        print(f"\nScouting reports count: {reports_count} (unlinked to player: {unlinked_reports})")
        print(f"Shortlists count: {shortlists_count} | Shortlist entries: {shortlist_players} (unlinked: {unlinked_sl_players})")

        # 13. Check scouting report player names
        reports = conn.execute(text("SELECT sr.id, sr.scout_name, sr.overall_rating, p.name as player_name, sr.position_assessed FROM scouting_reports sr JOIN players p ON sr.player_id = p.id LIMIT 10")).fetchall()
        print("\nSample scouting reports:")
        for r in reports:
            print(f"  [{r[3]} ({r[4]})]: scout={r[1]} -> overall={r[2]}")

if __name__ == "__main__":
    run_audit()
