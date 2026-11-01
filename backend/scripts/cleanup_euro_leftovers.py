import sys
import os
import psycopg
from uuid import uuid4

sys.path.insert(0, os.path.abspath("."))
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

conn = psycopg.connect("postgresql://postgres:Gaurav%40123@localhost:5432/twelve_man")
cur = conn.cursor()

print("--- STARTING EURO LEFTOVERS CLEANUP ---")

# 1. Identify Euro-related shortlists
cur.execute("SELECT id, name FROM shortlists WHERE name ILIKE '%Euro%' OR description ILIKE '%Euro%'")
euro_shortlists = cur.fetchall()
euro_shortlist_ids = [row[0] for row in euro_shortlists]
print(f"Found {len(euro_shortlists)} Euro-specific shortlists to remove.")

# 2. Delete candidate records in these shortlists
if euro_shortlist_ids:
    cur.execute("DELETE FROM shortlist_players WHERE shortlist_id = ANY(%s)", (euro_shortlist_ids,))
    print(f"Deleted candidate entries belonging to Euro shortlists: {cur.rowcount}")
    cur.execute("DELETE FROM shortlists WHERE id = ANY(%s)", (euro_shortlist_ids,))
    print(f"Deleted Euro shortlists: {cur.rowcount}")

# 3. Clean up any remaining shortlist_players with '[Preserved from Euro target]'
cur.execute("DELETE FROM shortlist_players WHERE notes ILIKE '%[Preserved from Euro target]%'")
print(f"Deleted [Preserved from Euro target] shortlist_players: {cur.rowcount}")

# 4. Clean up scouting reports with '[Preserved from Euro target]'
cur.execute("DELETE FROM scouting_reports WHERE written_observations ILIKE '%[Preserved from Euro target]%'")
print(f"Deleted [Preserved from Euro target] scouting reports: {cur.rowcount}")

# 5. Ensure we have valid, realistic Bundesliga recruitment pipelines
cur.execute("SELECT id, name FROM shortlists")
remaining_shortlists = cur.fetchall()
print(f"Remaining shortlists in DB: {remaining_shortlists}")

# Find prominent Bundesliga players
cur.execute("SELECT id, name, primary_position FROM players WHERE name IN ('Florian Wirtz', 'Granit Xhaka', 'Julian Ryerson', 'Atakan Karazor', 'Lucas Silva Melo', 'Piero Hincapié', 'Robert Andrich')")
b_players = {row[1]: (row[0], row[2]) for row in cur.fetchall()}

# Create or verify 'Bundesliga Priority Targets'
cur.execute("SELECT id FROM shortlists WHERE name = 'Bundesliga Priority Targets'")
res = cur.fetchone()
if not res:
    sl_id = uuid4()
    cur.execute(
        "INSERT INTO shortlists (id, name, description, owner, created_at, updated_at) VALUES (%s, %s, %s, %s, NOW(), NOW()) RETURNING id",
        (sl_id, "Bundesliga Priority Targets", "Primary Bundesliga recruitment targets monitored across 2023/24 league fixtures", "Chief Scout")
    )
    b_priority_id = sl_id
    print("Created 'Bundesliga Priority Targets' shortlist.")
else:
    b_priority_id = res[0]

# Add candidates to Bundesliga Priority Targets
for p_name in ["Julian Ryerson", "Atakan Karazor", "Granit Xhaka"]:
    if p_name in b_players:
        pid, pos = b_players[p_name]
        cur.execute("SELECT id FROM shortlist_players WHERE shortlist_id = %s AND player_id = %s", (b_priority_id, pid))
        if not cur.fetchone():
            cur.execute(
                "INSERT INTO shortlist_players (id, shortlist_id, player_id, recruitment_status, notes, added_date, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, CURRENT_DATE, NOW(), NOW())",
                (uuid4(), b_priority_id, pid, "Shortlisted", f"Elite tactical performer in Bundesliga 2023/24 ({pos})")
            )
            print(f"Added {p_name} to Bundesliga Priority Targets.")

# Create or verify 'Under-23 Bundesliga Prospects'
cur.execute("SELECT id FROM shortlists WHERE name = 'Under-23 Bundesliga Prospects'")
res = cur.fetchone()
if not res:
    sl_id = uuid4()
    cur.execute(
        "INSERT INTO shortlists (id, name, description, owner, created_at, updated_at) VALUES (%s, %s, %s, %s, NOW(), NOW()) RETURNING id",
        (sl_id, "Under-23 Bundesliga Prospects", "High-ceiling domestic prospects under age 24 in 1. Bundesliga", "Technical Director")
    )
    u23_id = sl_id
    print("Created 'Under-23 Bundesliga Prospects' shortlist.")
else:
    u23_id = res[0]

for p_name in ["Florian Wirtz", "Piero Hincapié"]:
    if p_name in b_players:
        pid, pos = b_players[p_name]
        cur.execute("SELECT id FROM shortlist_players WHERE shortlist_id = %s AND player_id = %s", (u23_id, pid))
        if not cur.fetchone():
            cur.execute(
                "INSERT INTO shortlist_players (id, shortlist_id, player_id, recruitment_status, notes, added_date, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, CURRENT_DATE, NOW(), NOW())",
                (uuid4(), u23_id, pid, "Watchlist", f"High developmental ceiling and match influence ({pos})")
            )
            print(f"Added {p_name} to Under-23 Bundesliga Prospects.")

conn.commit()

# Verification query
cur.execute("""
    SELECT s.name, count(sp.id)
    FROM shortlists s
    LEFT JOIN shortlist_players sp ON s.id = sp.shortlist_id
    GROUP BY s.name
""")
print("\nFinal verified shortlists and player counts:")
for row in cur.fetchall():
    print(f"  - {row[0]}: {row[1]} player(s)")

cur.execute("SELECT count(*) FROM scouting_reports")
print(f"Final verified scouting reports count: {cur.fetchone()[0]}")

conn.close()
print("--- EURO LEFTOVERS CLEANUP FINISHED SUCCESSFULLY ---")
