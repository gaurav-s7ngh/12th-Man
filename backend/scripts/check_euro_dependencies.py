import sys
import os
sys.path.insert(0, os.path.abspath("."))

from app.db.session import SessionLocal
from sqlalchemy import text

db = SessionLocal()

# Find Euro competition and season
euro_comp = db.execute(text("SELECT id, name FROM competitions WHERE name ILIKE '%Euro%'")).fetchone()
bld_comp = db.execute(text("SELECT id, name FROM competitions WHERE name ILIKE '%Bundesliga%'")).fetchone()

print(f"Euro competition: {euro_comp}")
print(f"Bundesliga competition: {bld_comp}")

# Matches breakdown
euro_matches = db.execute(text("SELECT count(*) FROM matches WHERE competition_id = :cid"), {"cid": euro_comp[0]}).scalar()
bld_matches = db.execute(text("SELECT count(*) FROM matches WHERE competition_id = :cid"), {"cid": bld_comp[0]}).scalar()
print(f"Euro matches: {euro_matches}, Bundesliga matches: {bld_matches}")

# Players breakdown
# Bundesliga players: players who have appearances in Bundesliga matches
bld_players = db.execute(text("""
    SELECT DISTINCT pa.player_id 
    FROM player_appearances pa
    JOIN matches m ON pa.match_id = m.id
    WHERE m.competition_id = :cid
"""), {"cid": bld_comp[0]}).fetchall()
bld_player_ids = set(p[0] for p in bld_players)
print(f"Bundesliga players count: {len(bld_player_ids)}")

euro_only_players = db.execute(text("""
    SELECT DISTINCT pa.player_id, p.name
    FROM player_appearances pa
    JOIN matches m ON pa.match_id = m.id
    JOIN players p ON pa.player_id = p.id
    WHERE m.competition_id = :euro_cid
    AND pa.player_id NOT IN (
        SELECT DISTINCT pa2.player_id 
        FROM player_appearances pa2
        JOIN matches m2 ON pa2.match_id = m2.id
        WHERE m2.competition_id = :bld_cid
    )
"""), {"euro_cid": euro_comp[0], "bld_cid": bld_comp[0]}).fetchall()
print(f"Euro-only players count: {len(euro_only_players)}")

# Overlapping players (players in both Euro and Bundesliga, e.g. Wirtz, Musiala, Xhaka, Kane)
overlap_players = db.execute(text("""
    SELECT DISTINCT p.name
    FROM player_appearances pa
    JOIN matches m ON pa.match_id = m.id
    JOIN players p ON pa.player_id = p.id
    WHERE m.competition_id = :euro_cid
    AND pa.player_id IN (
        SELECT DISTINCT pa2.player_id 
        FROM player_appearances pa2
        JOIN matches m2 ON pa2.match_id = m2.id
        WHERE m2.competition_id = :bld_cid
    )
"""), {"euro_cid": euro_comp[0], "bld_cid": bld_comp[0]}).fetchall()
print(f"Overlap players count (present in both): {len(overlap_players)}")


# Check scouting reports and shortlists referencing Euro-only players
sr_refs = db.execute(text("""
    SELECT sr.id, sr.player_id, p.name
    FROM scouting_reports sr
    JOIN players p ON sr.player_id = p.id
    WHERE sr.player_id IN (
        SELECT DISTINCT pa.player_id
        FROM player_appearances pa
        JOIN matches m ON pa.match_id = m.id
        WHERE m.competition_id = :euro_cid
        AND pa.player_id NOT IN (
            SELECT DISTINCT pa2.player_id FROM player_appearances pa2
            JOIN matches m2 ON pa2.match_id = m2.id WHERE m2.competition_id = :bld_cid
        )
    )
"""), {"euro_cid": euro_comp[0], "bld_cid": bld_comp[0]}).fetchall()
print(f"\nScouting reports referencing Euro-only players: {len(sr_refs)}")
for r in sr_refs:
    print(r)

sl_refs = db.execute(text("""
    SELECT sp.id, sp.player_id, p.name
    FROM shortlist_players sp
    JOIN players p ON sp.player_id = p.id
    WHERE sp.player_id IN (
        SELECT DISTINCT pa.player_id
        FROM player_appearances pa
        JOIN matches m ON pa.match_id = m.id
        WHERE m.competition_id = :euro_cid
        AND pa.player_id NOT IN (
            SELECT DISTINCT pa2.player_id FROM player_appearances pa2
            JOIN matches m2 ON pa2.match_id = m2.id WHERE m2.competition_id = :bld_cid
        )
    )
"""), {"euro_cid": euro_comp[0], "bld_cid": bld_comp[0]}).fetchall()
print(f"\nShortlist players referencing Euro-only players: {len(sl_refs)}")
for r in sl_refs:
    print(r)

# Teams breakdown
euro_teams = db.execute(text("""
    SELECT t.id, t.name, count(m.id)
    FROM teams t
    JOIN matches m ON (m.home_team_id = t.id OR m.away_team_id = t.id)
    WHERE m.competition_id = :cid
    GROUP BY t.id, t.name
"""), {"cid": euro_comp[0]}).fetchall()
print(f"\nEuro teams: {len(euro_teams)}")

bld_teams = db.execute(text("""
    SELECT t.id, t.name, count(m.id)
    FROM teams t
    JOIN matches m ON (m.home_team_id = t.id OR m.away_team_id = t.id)
    WHERE m.competition_id = :cid
    GROUP BY t.id, t.name
"""), {"cid": bld_comp[0]}).fetchall()
print(f"Bundesliga teams: {len(bld_teams)}")

# Check club's linked team
club = db.execute(text("SELECT id, name, linked_team_id FROM clubs")).fetchone()
print(f"\nClub: {club}")
if club and club[2]:
    linked_team = db.execute(text("SELECT id, name FROM teams WHERE id = :tid"), {"tid": club[2]}).fetchone()
    print(f"Club linked team: {linked_team}")

db.close()
