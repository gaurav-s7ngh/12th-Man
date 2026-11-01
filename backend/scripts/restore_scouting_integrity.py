import sys
import os
import psycopg
from uuid import UUID

sys.path.insert(0, os.path.abspath("."))
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

conn = psycopg.connect("postgresql://postgres:Gaurav%40123@localhost:5432/twelve_man")
cur = conn.cursor()

print("--- RESTORING SCOUTING INTEGRITY & ORIGINAL ASSOCIATIONS ---")

# 1. Restore Aaron Ramsdale and Bernardo Silva as scouted external players
ramsdale_id = UUID("47d03811-30f3-48ce-b519-651a4b082a99")
silva_id = UUID("178fd288-d79b-48d2-b0c5-b5bdba5ab070")

cur.execute("SELECT id FROM players WHERE id = %s", (ramsdale_id,))
if not cur.fetchone():
    cur.execute(
        """
        INSERT INTO players (id, external_id, name, nationality, primary_position, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
        """,
        (ramsdale_id, "22783", "Aaron Ramsdale", "England", "Goalkeeper")
    )
    print("Restored Aaron Ramsdale (original ID).")
else:
    print("Aaron Ramsdale already present.")

cur.execute("SELECT id FROM players WHERE id = %s", (silva_id,))
if not cur.fetchone():
    cur.execute(
        """
        INSERT INTO players (id, external_id, name, nationality, primary_position, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
        """,
        (silva_id, "3193", "Bernardo Mota Veiga de Carvalho e Silva", "Portugal", "Center Attacking Midfield")
    )
    print("Restored Bernardo Silva (original ID).")
else:
    print("Bernardo Silva already present.")

# 2. Re-create or restore the original scouting reports extracted from the backup
# From backup dump:
# Silva report: id=632b0986-b503-4bac-bfd0-f06905ae80c7, player_id=178fd288-d79b-48d2-b0c5-b5bdba5ab070
cur.execute("SELECT id FROM scouting_reports WHERE id = %s", (UUID("632b0986-b503-4bac-bfd0-f06905ae80c7"),))
if not cur.fetchone():
    cur.execute(
        """
        INSERT INTO scouting_reports (
            id, player_id, scout_name, position_assessed, technical_rating, tactical_rating,
            physical_rating, mental_rating, overall_rating, strengths, weaknesses,
            written_observations, assessment_date, created_at, updated_at
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW()
        )
        """,
        (
            UUID("632b0986-b503-4bac-bfd0-f06905ae80c7"),
            silva_id,
            "Chief Scout",
            "Center Back",
            7.0, 7.5, 8.0, 7.0, 7.4,
            '["Aerial duels", "Tackling"]',
            '["Ball distribution"]',
            "Strong in the air with disciplined positioning.",
            "2024-07-01"
        )
    )
    print("Restored original scouting report for Bernardo Silva.")

# Clean up any leftover 'Euro 2024 Breakout Talents' shortlist if created by test
cur.execute("SELECT id FROM shortlists WHERE name ILIKE '%Euro 2024%'")
euro_ids = [r[0] for r in cur.fetchall()]
if euro_ids:
    cur.execute("DELETE FROM shortlist_players WHERE shortlist_id = ANY(%s)", (euro_ids,))
    cur.execute("DELETE FROM shortlists WHERE id = ANY(%s)", (euro_ids,))
    print(f"Removed {len(euro_ids)} residual Euro shortlists.")

conn.commit()
conn.close()
print("--- SCOUTING RESTORATION COMPLETE ---")
