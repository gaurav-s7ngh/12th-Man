import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_root():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "running"


def test_health():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_db_health():
    response = client.get("/api/v1/db-health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "connected"
    assert data["database"] == "twelve_man"


def test_competitions():
    response = client.get("/api/v1/competitions")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert any(c["name"] == "1. Bundesliga" for c in data)


def test_teams():
    response = client.get("/api/v1/teams")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 18  # 18 Bundesliga teams


def test_team_detail():
    teams_res = client.get("/api/v1/teams")
    team_id = teams_res.json()[0]["id"]

    response = client.get(f"/api/v1/teams/{team_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == team_id
    assert "players" in data
    assert data["matches_count"] >= 1


def test_players_pagination_and_search():
    # Pagination
    response = client.get("/api/v1/players?page=1&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert data["page"] == 1
    assert data["page_size"] == 10
    assert len(data["items"]) == 10
    assert data["total"] >= 450

    # Search
    search_res = client.get("/api/v1/players?search=Wirtz")
    assert search_res.status_code == 200
    search_data = search_res.json()
    assert any("Florian" in p["name"] for p in search_data["items"])


def test_player_detail_and_stats():
    players_res = client.get("/api/v1/players?search=Wirtz")
    assert players_res.status_code == 200
    items = players_res.json()["items"]
    assert len(items) > 0
    player_id = items[0]["id"]

    # Detail
    detail_res = client.get(f"/api/v1/players/{player_id}")
    assert detail_res.status_code == 200
    detail_data = detail_res.json()
    assert detail_data["id"] == player_id
    assert detail_data["appearances_count"] >= 1

    # Statistics
    stats_res = client.get(f"/api/v1/players/{player_id}/statistics")
    assert stats_res.status_code == 200
    stats_data = stats_res.json()
    assert "aggregated" in stats_data
    assert "match_stats" in stats_data


def test_matches_pagination():
    response = client.get("/api/v1/matches?page=1&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert data["page"] == 1
    assert data["page_size"] == 10
    assert data["total"] == 34  # 34 Bundesliga matches
    assert len(data["items"]) == 10

    # Match detail
    match_id = data["items"][0]["id"]
    detail_res = client.get(f"/api/v1/matches/{match_id}")
    assert detail_res.status_code == 200
    assert detail_res.json()["id"] == match_id


def test_bundesliga_competition_filtering():
    # Verify Bundesliga competition exists and filters matches
    comps_res = client.get("/api/v1/competitions")
    assert comps_res.status_code == 200
    comps = comps_res.json()
    comp_names = [c["name"] for c in comps]
    assert "1. Bundesliga" in comp_names

    bundesliga = next(c for c in comps if c["name"] == "1. Bundesliga")

    # Filter matches by competition
    b_matches = client.get(f"/api/v1/matches?competition_id={bundesliga['id']}").json()
    assert b_matches["total"] == 34


def test_scouting_report_lifecycle():
    # Get a player
    players_res = client.get("/api/v1/players?page_size=1")
    player_id = players_res.json()["items"][0]["id"]

    # Create scouting report
    create_payload = {
        "scout_name": "Chief Scout",
        "position_assessed": "Winger",
        "technical_rating": 8.5,
        "tactical_rating": 8.0,
        "physical_rating": 7.5,
        "mental_rating": 8.0,
        "overall_rating": 8.2,
        "strengths": ["1v1 dribbling", "Explosive acceleration", "Vision"],
        "weaknesses": ["Defensive tracking under transition"],
        "written_observations": "Exceptional prospect with elite technical fundamentals.",
    }
    create_res = client.post(f"/api/v1/players/{player_id}/scouting-reports", json=create_payload)
    assert create_res.status_code == 201
    created = create_res.json()
    assert created["overall_rating"] == 8.2

    # Fetch scouting reports
    list_res = client.get(f"/api/v1/players/{player_id}/scouting-reports")
    assert list_res.status_code == 200
    assert any(r["id"] == created["id"] for r in list_res.json())


def test_shortlist_lifecycle():
    # Create shortlist
    sl_payload = {
        "name": "Bundesliga Monitored Targets",
        "description": "High-priority targets identified during 2023/24 league campaign",
        "owner": "Head of Recruitment",
    }
    sl_res = client.post("/api/v1/shortlists", json=sl_payload)
    assert sl_res.status_code == 201
    sl_data = sl_res.json()
    sl_id = sl_data["id"]

    # List shortlists
    all_sl = client.get("/api/v1/shortlists").json()
    assert any(s["id"] == sl_id for s in all_sl)

    # Add player to shortlist
    players_res = client.get("/api/v1/players?page_size=1")
    player_id = players_res.json()["items"][0]["id"]

    add_res = client.post(
        f"/api/v1/shortlists/{sl_id}/players",
        json={"player_id": player_id, "notes": "Top priority target", "recruitment_status": "Target"},
    )
    assert add_res.status_code == 201

    # Get shortlist detail
    detail_res = client.get(f"/api/v1/shortlists/{sl_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert len(detail["players"]) >= 1
    assert detail["players"][0]["player_id"] == player_id
    entry_id = detail["players"][0]["id"]
    # Verify normalized initial status
    assert detail["players"][0]["recruitment_status"] == "Watchlist"

    # Advance 1: Watchlist -> Shortlist
    adv1 = client.post(f"/api/v1/shortlists/{sl_id}/players/{entry_id}/advance")
    assert adv1.status_code == 200
    assert adv1.json()["recruitment_status"] == "Shortlist"

    # Advance 2: Shortlist -> Scout Review
    adv2 = client.post(f"/api/v1/shortlists/{sl_id}/players/{entry_id}/advance")
    assert adv2.status_code == 200
    assert adv2.json()["recruitment_status"] == "Scout Review"

    # Advance 3: Scout Review -> Follow-up
    adv3 = client.post(f"/api/v1/shortlists/{sl_id}/players/{entry_id}/advance")
    assert adv3.status_code == 200
    assert adv3.json()["recruitment_status"] == "Follow-up"

    # Advance 4: Follow-up -> Final Decision
    adv4 = client.post(f"/api/v1/shortlists/{sl_id}/players/{entry_id}/advance")
    assert adv4.status_code == 200
    assert adv4.json()["recruitment_status"] == "Final Decision"

    # Advance 5: Cannot advance past Final Decision
    adv5 = client.post(f"/api/v1/shortlists/{sl_id}/players/{entry_id}/advance")
    assert adv5.status_code == 200
    assert adv5.json()["recruitment_status"] == "Final Decision"

    # Stage update via PATCH (Drag-and-drop support)
    patch_res = client.patch(
        f"/api/v1/shortlists/{sl_id}/players/{entry_id}",
        json={"recruitment_status": "Shortlist", "notes": "Moved back for re-evaluation"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["recruitment_status"] == "Shortlist"
    assert patch_res.json()["notes"] == "Moved back for re-evaluation"

    # Remove player from shortlist using entry_id
    del_p_res = client.delete(f"/api/v1/shortlists/{sl_id}/players/{entry_id}")
    assert del_p_res.status_code == 204

    # Verify player is gone from shortlist
    detail_res2 = client.get(f"/api/v1/shortlists/{sl_id}")
    assert detail_res2.status_code == 200
    assert len(detail_res2.json()["players"]) == 0

    # Verify underlying player record still exists!
    player_check = client.get(f"/api/v1/players/{player_id}")
    assert player_check.status_code == 200
    assert player_check.json()["id"] == player_id

    # Re-add player and test deletion by player_id
    re_add = client.post(
        f"/api/v1/shortlists/{sl_id}/players",
        json={"player_id": player_id, "notes": "Re-added for player_id delete test", "recruitment_status": "Watchlist"},
    )
    assert re_add.status_code == 201

    # Delete using player_id instead of entry_id
    del_by_player_id_res = client.delete(f"/api/v1/shortlists/{sl_id}/players/{player_id}")
    assert del_by_player_id_res.status_code == 204

    # Verify player is gone again
    detail_res3 = client.get(f"/api/v1/shortlists/{sl_id}")
    assert detail_res3.status_code == 200
    assert len(detail_res3.json()["players"]) == 0

    # Underlying player STILL exists
    assert client.get(f"/api/v1/players/{player_id}").status_code == 200

    # Delete shortlist
    del_sl_res = client.delete(f"/api/v1/shortlists/{sl_id}")
    assert del_sl_res.status_code == 204

    # Verify shortlist is gone
    get_sl_res = client.get(f"/api/v1/shortlists/{sl_id}")
    assert get_sl_res.status_code == 404
