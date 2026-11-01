import sys
import os
sys.path.insert(0, os.path.abspath("."))

from app.db.session import SessionLocal
from sqlalchemy import text

db = SessionLocal()

euro_comp = db.execute(text("SELECT id, name FROM competitions WHERE name ILIKE '%Euro%'")).fetchone()
bld_comp = db.execute(text("SELECT id, name FROM competitions WHERE name ILIKE '%Bundesliga%'")).fetchone()

print(f"Euro competition: {euro_comp}")
print(f"Bundesliga competition: {bld_comp}")

# Check data sources table
data_sources = db.execute(text("SELECT * FROM data_sources")).fetchall()
print("\n--- DATA SOURCES ---")
for ds in data_sources:
    print(ds)

# Find a goalkeeper and an outfield player in Bundesliga to preserve reports/shortlists
hradecky = db.execute(text("SELECT id, name FROM players WHERE name ILIKE '%Hradecky%'")).fetchone()
wirtz = db.execute(text("SELECT id, name FROM players WHERE name ILIKE '%Wirtz%'")).fetchone()
print(f"Re-anchoring targets if needed: Goalkeeper={hradecky}, Midfielder={wirtz}")

# Check Euro matches
euro_matches = db.execute(text("SELECT id, match_date FROM matches WHERE competition_id = :cid"), {"cid": euro_comp[0]}).fetchall()
print(f"Euro matches to delete: {len(euro_matches)}")

# Check Euro teams
euro_teams = db.execute(text("""
    SELECT DISTINCT t.id, t.name 
    FROM teams t
    WHERE t.id IN (
        SELECT home_team_id FROM matches WHERE competition_id = :cid
        UNION
        SELECT away_team_id FROM matches WHERE competition_id = :cid
    )
    AND t.id NOT IN (
        SELECT home_team_id FROM matches WHERE competition_id = :bld_cid
        UNION
        SELECT away_team_id FROM matches WHERE competition_id = :bld_cid
    )
"""), {"cid": euro_comp[0], "bld_cid": bld_comp[0]}).fetchall()
print(f"Euro-only teams to delete: {len(euro_teams)}")

# Check Euro-only players
euro_only_players = db.execute(text("""
    SELECT DISTINCT p.id, p.name 
    FROM players p
    WHERE p.id IN (
        SELECT player_id FROM player_appearances pa
        JOIN matches m ON pa.match_id = m.id
        WHERE m.competition_id = :cid
    )
    AND p.id NOT IN (
        SELECT player_id FROM player_appearances pa
        JOIN matches m ON pa.match_id = m.id
        WHERE m.competition_id = :bld_cid
    )
"""), {"cid": euro_comp[0], "bld_cid": bld_comp[0]}).fetchall()
print(f"Euro-only players to delete: {len(euro_only_players)}")

# Check Euro seasons
euro_seasons = db.execute(text("SELECT id, name FROM seasons WHERE competition_id = :cid"), {"cid": euro_comp[0]}).fetchall()
print(f"Euro seasons to delete: {euro_seasons}")

db.close()
