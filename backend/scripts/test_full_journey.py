import json
import urllib.request
import sys
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

sys.stdout.reconfigure(encoding='utf-8')
BASE_URL = "http://127.0.0.1:8000"

def get(path):
    req = urllib.request.Request(f"{BASE_URL}{path}", headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def post(path, data=None):
    body = json.dumps(data).encode("utf-8") if data else b""
    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=body,
        method="POST",
        headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"}
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def delete(path):
    req = urllib.request.Request(f"{BASE_URL}{path}", method="DELETE", headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as resp:
        return resp.status

def run_e2e_journey():
    print("=" * 75)
    print("12TH MAN — FULL PRODUCT JOURNEY END-TO-END VERIFICATION")
    print("Club Selection → Squad Analysis → Recruitment Need → Discovery →")
    print("Player Dossier → Comparison → Shortlist → Scouting Report")
    print("=" * 75)

    # 1. Club Selection
    clubs = get("/api/v1/club/available")
    bayern = next(c for c in clubs if "Bayern" in c["name"])
    print(f"\n[1] Select Club: Switching to {bayern['name']} (ID: {bayern['id']})...")
    sel_res = post(f"/api/v1/club/select/{bayern['id']}")
    assert sel_res["name"] == "Bayern Munich"
    print(f"    Active club: {sel_res['name']} | Manager: {sel_res.get('manager_name')}")

    # 2. Squad Analysis
    print("\n[2] Squad Analysis...")
    assess = get("/api/v1/club/squad-assessment")
    print(f"    Club: {assess['club_name']} | Squad Size: {assess['total_squad_size']}")
    assert assess["club_name"] == "Bayern Munich"
    assert assess["total_squad_size"] > 0
    for cat in assess["depth_categories"]:
        print(f"    - {cat['category']}: count={cat['current_count']}, status={cat['status']}")

    # 3. Recruitment Need Creation
    print("\n[3] Create Recruitment Need...")
    need_data = {
        "title": "Elite Winger for Counter-Attacking Transitions",
        "position": "Winger",
        "role_profile": "Inverted Creator",
        "priority": "High",
        "rationale": "Add tactical width and 1v1 dribbling penetration.",
        "target_metrics": {"key_passes_p90": 2.0, "dribbles_completed_p90": 2.5}
    }
    need = post(f"/api/v1/club/recruitment-needs?club_id={bayern['id']}", need_data)
    need_id = need["id"]
    print(f"    Created Need ID: {need_id} | Title: {need['title']}")

    # 4. Player Discovery
    print("\n[4] Candidate Discovery for Inverted Creator (Winger)...")
    candidates = get("/api/v1/recruitment/discover?role_profile=Inverted%20Creator&position=Winger&min_minutes=90&limit=5")
    print(f"    Candidates discovered: {len(candidates)}")
    assert len(candidates) > 0
    cand1 = candidates[0]
    print(f"    Top Candidate: {cand1['name']} ({cand1['current_club']}) | Fit: {cand1['fit_score']}% | Min: {cand1['total_minutes']:,}")

    # 5. Player Dossier & Detailed Stats
    print(f"\n[5] Fetch Player Dossier for {cand1['name']} ({cand1['id']})...")
    dossier = get(f"/api/v1/players/{cand1['id']}")
    stats = get(f"/api/v1/players/{cand1['id']}/statistics")
    agg = stats["aggregated"]
    print(f"    Dossier: {dossier['name']} | Nationality: {dossier.get('nationality')} | Foot: {dossier.get('preferred_foot')}")
    print(f"    Stats: Minutes={agg['total_minutes']:,} | Matches={agg['matches_played']} | Goals={agg['goals']} | Assists={agg['assists']}")
    assert agg["total_minutes"] > 0

    # 6. Comparison with second player
    cand2 = candidates[1] if len(candidates) > 1 else candidates[0]
    print(f"\n[6] Head-to-Head Comparison: {cand1['name']} vs {cand2['name']}...")
    dossier2 = get(f"/api/v1/players/{cand2['id']}")
    stats2 = get(f"/api/v1/players/{cand2['id']}/statistics")
    agg2 = stats2["aggregated"]
    print(f"    Metric Comparison:")
    print(f"    - Minutes: {agg['total_minutes']:,} vs {agg2['total_minutes']:,}")
    print(f"    - Goals:   {agg['goals']} vs {agg2['goals']}")
    print(f"    - Assists: {agg['assists']} vs {agg2['assists']}")
    print(f"    - xG/90:   {agg['xg_per_90']:.2f} vs {agg2['xg_per_90']:.2f}")

    # 7. Shortlist: Create Shortlist & Add Player
    print(f"\n[7] Shortlists: Create shortlist and add candidate...")
    sl = post("/api/v1/shortlists", {
        "name": "Audit Verification Shortlist 2024",
        "description": "Shortlist generated during end-to-end audit",
        "owner": "Technical Director"
    })
    sl_id = sl["id"]
    print(f"    Created Shortlist ID: {sl_id} | Name: {sl['name']}")

    sl_player = post(f"/api/v1/shortlists/{sl_id}/players", {
        "player_id": cand1["id"],
        "recruitment_status": "Targeted",
        "notes": f"Scouted for {need['title']}. High match telemetry fit."
    })
    print(f"    Added player to shortlist: {sl_player['player_id']} | Status: {sl_player['recruitment_status']}")

    # 8. Scouting Report Creation
    print(f"\n[8] Scouting Reports: Log assessment report...")
    report = post(f"/api/v1/players/{cand1['id']}/scouting-reports", {
        "scout_name": "Chief Scout",
        "position_assessed": cand1["primary_position"],
        "technical_rating": 8.5,
        "tactical_rating": 8.0,
        "physical_rating": 7.5,
        "mental_rating": 8.0,
        "overall_rating": 8.1,
        "strengths": ["Progressive dribbling", "1v1 chance creation"],
        "weaknesses": ["Defensive aerial duels"],
        "written_observations": "Exceptional transition threat verified against high-block opponents."
    })
    report_id = report["id"]
    print(f"    Created Scouting Report ID: {report_id} | Rating: {report['overall_rating']} | Notes: {report['written_observations']}")

    # Verify retrieval of scouting report
    player_reports = get(f"/api/v1/players/{cand1['id']}/scouting-reports")
    assert any(r["id"] == report_id for r in player_reports)
    print(f"    Verified report persists in player's dossiers list (Count: {len(player_reports)})")

    # Cleanup temporary test records
    print("\n--- Cleaning up temporary test records ---")
    delete(f"/api/v1/club/recruitment-needs/{need_id}")
    
    # Clean up test shortlist and report from DB
    from sqlalchemy import create_engine, text
    from app.core.config import settings
    engine = create_engine(settings.DATABASE_URL)
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM shortlist_players WHERE shortlist_id = :id"), {"id": sl_id})
        conn.execute(text("DELETE FROM shortlists WHERE id = :id"), {"id": sl_id})
        conn.execute(text("DELETE FROM scouting_reports WHERE id = :id"), {"id": report_id})
    print("    Cleaned up need, shortlist, and scouting report.")

    print("\n" + "=" * 75)
    print("FULL PRODUCT JOURNEY COMPLETED AND VERIFIED SUCCESSFULLY!")
    print("=" * 75)

if __name__ == "__main__":
    run_e2e_journey()
