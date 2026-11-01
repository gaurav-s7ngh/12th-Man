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
    assert any(c["name"] == "UEFA Euro" for c in data)


def test_teams():
    response = client.get("/api/v1/teams")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 20  # 24 Euro 2024 teams


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
    assert data["total"] > 500

    # Search
    search_res = client.get("/api/v1/players?search=Jude")
    assert search_res.status_code == 200
    search_data = search_res.json()
    assert any("Bellingham" in p["name"] for p in search_data["items"])


def test_player_detail_and_stats():
    players_res = client.get("/api/v1/players?search=Yamal")
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
    assert data["total"] == 51  # 51 Euro 2024 matches
    assert len(data["items"]) == 10

    # Match detail
    match_id = data["items"][0]["id"]
    detail_res = client.get(f"/api/v1/matches/{match_id}")
    assert detail_res.status_code == 200
    assert detail_res.json()["id"] == match_id


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
        "name": "Euro 2024 Breakout Talents",
        "description": "High-priority targets identified during tournament",
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
