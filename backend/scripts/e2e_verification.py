import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://127.0.0.1:8000"

def get(path):
    req = urllib.request.Request(f"{BASE_URL}{path}", headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def post(path):
    req = urllib.request.Request(f"{BASE_URL}{path}", method="POST", headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def run_workflow():
    print("=" * 70)
    print("12TH MAN — END-TO-END MANDATORY WORKFLOW VERIFICATION")
    print("=" * 70)

    # 1. Available Clubs check
    clubs = get("/api/v1/club/available")
    assert len(clubs) == 18, f"Expected 18 clubs, got {len(clubs)}"
    print(f"Step 0: Verified {len(clubs)} Bundesliga clubs available in database.")

    bayern = next(c for c in clubs if "Bayern" in c["name"])
    dortmund = next(c for c in clubs if "Dortmund" in c["name"])
    leverkusen = next(c for c in clubs if "Leverkusen" in c["name"])

    # STEP 1: Select Bayern München
    print("\n--- STEP 1: Select Bayern München ---")
    active_b = post(f"/api/v1/club/select/{bayern['id']}")
    print(f"Active Club: {active_b['name']} | Manager: {active_b.get('manager_name')} | Formation: {active_b.get('primary_formation')}")
    assess_b = get("/api/v1/club/squad-assessment")
    print(f"Squad Assessment: {assess_b['club_name']} | Squad Size: {assess_b['total_squad_size']}")
    assert assess_b["club_name"] == "Bayern Munich"
    assert assess_b["total_squad_size"] == 27

    # STEP 2 & 3: Open Scouting and filter Midfielders (LM, RM, CM)
    print("\n--- STEP 2 & 3: Scouting Midfielders Filter (Verify LM, RM, CM) ---")
    mids_res = get("/api/v1/players?position=Midfielder&page_size=100")
    print(f"Total Midfielders returned: {mids_res['total']}")
    distinct_mid_positions = set(p["primary_position"] for p in mids_res["items"])
    print(f"Distinct Midfielder positions found: {sorted(distinct_mid_positions)}")
    
    # Check for presence of LM, RM, and Central positions
    has_wide_mid = any("left midfield" in p.lower() or "right midfield" in p.lower() for p in distinct_mid_positions)
    has_central_mid = any("center midfield" in p.lower() or "defensive midfield" in p.lower() or "attacking midfield" in p.lower() for p in distinct_mid_positions)
    print(f"Wide Midfielders (LM/RM) present: {has_wide_mid}")
    print(f"Central Midfielders (CM/DM/AM) present: {has_central_mid}")
    assert has_wide_mid and has_central_mid, "Midfield filter must include both wide and central positions"

    # Sample mid players
    print("Sample Midfielders:")
    for p in mids_res["items"][:5]:
        print(f"  - {p['name']} ({p['primary_position']}) - {p['total_minutes']:,} minutes")

    # STEP 4: Filter Wingers (verify LW and RW appear)
    print("\n--- STEP 4: Scouting Wingers Filter (Verify LW & RW) ---")
    wingers_res = get("/api/v1/players?position=Winger&page_size=50")
    print(f"Total Wingers returned: {wingers_res['total']}")
    distinct_wng_positions = set(p["primary_position"] for p in wingers_res["items"])
    print(f"Distinct Winger positions found: {sorted(distinct_wng_positions)}")
    has_lw = any("left wing" in p.lower() for p in distinct_wng_positions)
    has_rw = any("right wing" in p.lower() for p in distinct_wng_positions)
    print(f"Left Wing (LW) present: {has_lw}")
    print(f"Right Wing (RW) present: {has_rw}")
    assert has_lw and has_rw, "Winger filter must include both Left Wing and Right Wing"
    
    # Ensure NO center forwards or central midfielders slipped into Wingers
    for p in wingers_res["items"]:
        assert p["primary_position"] in ["Left Wing", "Right Wing", "Left Wing Forward", "Right Wing Forward"], f"Invalid winger: {p}"
    print("Sample Wingers:")
    for p in wingers_res["items"][:5]:
        print(f"  - {p['name']} ({p['primary_position']}) - {p['total_minutes']:,} minutes")

    # STEP 5: Apply minimum-minutes filter and verify displayed figures
    print("\n--- STEP 5: Apply Minimum-Minutes Filter (e.g. 900 minutes) ---")
    min_mins = 900
    filtered_mins = get(f"/api/v1/players?min_minutes={min_mins}&page_size=50")
    print(f"Players with >= {min_mins} minutes: {filtered_mins['total']}")
    all_meet_mins = all(p["total_minutes"] >= min_mins for p in filtered_mins["items"])
    print(f"All returned players have >= {min_mins} minutes: {all_meet_mins}")
    assert all_meet_mins
    print("Sample players meeting playing-time criteria:")
    for p in filtered_mins["items"][:5]:
        print(f"  - {p['name']}: {p['total_minutes']:,} minutes (>= {min_mins})")

    # STEP 6: Open player dossier and check its data
    print("\n--- STEP 6: Open Player Dossier (Florian Wirtz) ---")
    wirtz_res = get("/api/v1/players?search=Florian%20Wirtz")
    assert wirtz_res["total"] >= 1
    wirtz = wirtz_res["items"][0]
    dossier = get(f"/api/v1/players/{wirtz['id']}")
    print(f"Player: {dossier['name']}")
    print(f"Nationality: {dossier.get('nationality')} | Preferred Foot: {dossier.get('preferred_foot')} | Position: {dossier.get('primary_position')}")
    stats = get(f"/api/v1/players/{wirtz['id']}/statistics")
    agg = stats["aggregated"]
    print(f"Aggregated Stats: Minutes={agg['total_minutes']:,} | Matches={agg['matches_played']} | Goals={agg['goals']} | Assists={agg['assists']} | total_xG={agg['total_xg']:.2f} | xG_per_90={agg['xg_per_90']:.2f}")
    assert agg["total_minutes"] > 0
    assert agg["matches_played"] > 0

    # STEP 7: Use Recruitment Filters and verify candidate results
    print("\n--- STEP 7: Recruitment Intelligence & Discovery ---")
    # Discover candidates for Box-to-Box Engine with position=Midfielder
    cand_res = get("/api/v1/recruitment/discover?role_profile=Box-to-Box%20Engine&position=Midfielder&min_minutes=180&limit=5")
    print(f"Candidates returned: {len(cand_res)}")
    for c in cand_res:
        print(f"  - {c['name']} ({c['current_club']}): Fit={c['fit_score']} | Role={c['role_profile']} | Minutes={c['total_minutes']:,}")
        assert "midfield" in c["primary_position"].lower()
        assert c["total_minutes"] >= 180

    # STEP 8: Switch to Borussia Dortmund and confirm all relevant pages update
    print("\n--- STEP 8: Switch to Borussia Dortmund ---")
    active_d = post(f"/api/v1/club/select/{dortmund['id']}")
    print(f"Active Club: {active_d['name']} | Manager: {active_d.get('manager_name')} | Formation: {active_d.get('primary_formation')}")
    assess_d = get("/api/v1/club/squad-assessment")
    print(f"Squad Assessment: {assess_d['club_name']} | Squad Size: {assess_d['total_squad_size']}")
    assert assess_d["club_name"] == "Borussia Dortmund"
    assert assess_d["total_squad_size"] == 27
    
    # Recruitment map for Dortmund
    map_d = get(f"/api/v1/recruitment/map?club_id={dortmund['id']}&limit=10")
    print(f"Recruitment Map for Dortmund: Candidates Evaluated={map_d['total_candidates']} | Priority Targets={map_d['priority_candidates_count']}")
    assert map_d["club_name"] == "Borussia Dortmund"

    # STEP 9: Repeat checks for Bayer Leverkusen
    print("\n--- STEP 9: Switch to Bayer 04 Leverkusen ---")
    active_l = post(f"/api/v1/club/select/{leverkusen['id']}")
    print(f"Active Club: {active_l['name']} | Manager: {active_l.get('manager_name')} | Formation: {active_l.get('primary_formation')}")
    assess_l = get("/api/v1/club/squad-assessment")
    print(f"Squad Assessment: {assess_l['club_name']} | Squad Size: {assess_l['total_squad_size']}")
    assert "Leverkusen" in assess_l["club_name"]
    assert assess_l["total_squad_size"] == 29

    # Recruitment map for Leverkusen
    map_l = get(f"/api/v1/recruitment/map?club_id={leverkusen['id']}&limit=10")
    print(f"Recruitment Map for Leverkusen: Candidates Evaluated={map_l['total_candidates']} | Priority Targets={map_l['priority_candidates_count']}")
    assert "Leverkusen" in map_l["club_name"]

    print("\n" + "=" * 70)
    print("ALL 9 WORKFLOW STEPS VERIFIED SUCCESSFULLY WITHOUT ERROR!")
    print("=" * 70)

if __name__ == "__main__":
    run_workflow()
