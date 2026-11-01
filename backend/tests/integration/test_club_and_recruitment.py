import uuid
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_club_get_and_update():
    # Test GET /api/v1/club
    res = client.get("/api/v1/club")
    assert res.status_code == 200
    data = res.json()
    assert "name" in data
    assert "primary_formation" in data
    assert "playing_style" in data
    assert "tactical_identity" in data
    club_id = data["id"]

    # Test PUT /api/v1/club
    update_res = client.put(
        "/api/v1/club",
        json={
            "manager_name": "Head of Football Intelligence",
            "primary_formation": "3-4-2-1",
        },
    )
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["manager_name"] == "Head of Football Intelligence"
    assert updated_data["primary_formation"] == "3-4-2-1"


def test_squad_assessment():
    res = client.get("/api/v1/club/squad-assessment")
    assert res.status_code == 200
    data = res.json()
    assert "total_squad_size" in data
    assert "depth_categories" in data
    assert "strengths" in data
    assert "vulnerabilities" in data
    assert len(data["depth_categories"]) >= 5


def test_recruitment_needs_crud():
    # Create need
    create_payload = {
        "title": "Elite Ball-Playing Center Back",
        "position": "Defender",
        "role_profile": "Ball-Playing Defender",
        "priority": "Critical",
        "target_age_min": 20,
        "target_age_max": 26,
        "target_metrics": {"passes_completed_p90": 60.0},
        "status": "Active",
        "rationale": "High line vulnerability requiring mobile recovery defender",
    }
    create_res = client.post("/api/v1/club/recruitment-needs", json=create_payload)
    assert create_res.status_code == 201
    created = create_res.json()
    need_id = created["id"]
    assert created["title"] == create_payload["title"]

    # List needs
    list_res = client.get("/api/v1/club/recruitment-needs")
    assert list_res.status_code == 200
    needs = list_res.json()
    assert any(n["id"] == need_id for n in needs)

    # Update need
    update_res = client.put(
        f"/api/v1/club/recruitment-needs/{need_id}",
        json={"priority": "High", "status": "Evaluating"},
    )
    assert update_res.status_code == 200
    assert update_res.json()["priority"] == "High"
    assert update_res.json()["status"] == "Evaluating"

    # Delete need
    del_res = client.delete(f"/api/v1/club/recruitment-needs/{need_id}")
    assert del_res.status_code == 204


def test_recruitment_discovery():
    roles_res = client.get("/api/v1/recruitment/roles")
    assert roles_res.status_code == 200
    roles = roles_res.json()
    assert "Ball-Winning Destroyer" in roles
    assert "Inverted Creator" in roles

    # Discover candidates
    disc_res = client.get(
        "/api/v1/recruitment/discover?role_profile=Ball-Winning Destroyer&min_minutes=90&min_fit_score=30&limit=10"
    )
    assert disc_res.status_code == 200
    candidates = disc_res.json()
    assert isinstance(candidates, list)
    if candidates:
        first = candidates[0]
        assert "fit_score" in first
        assert "metric_breakdown" in first
        assert "sample_confidence" in first


def test_recruitment_map_endpoint():
    # Test recruitment 2D map calculation
    map_res = client.get("/api/v1/recruitment/map?role_profile=Box-to-Box Engine&min_minutes=90&limit=20")
    assert map_res.status_code == 200
    data = map_res.json()
    assert data["role_profile"] == "Box-to-Box Engine"
    assert "club_name" in data
    assert "candidates" in data
    assert data["total_candidates"] > 0
    assert len(data["candidates"]) > 0

    first = data["candidates"][0]
    assert "profile_fit" in first
    assert "squad_complementarity" in first
    assert "quadrant" in first
    assert "strategic_explanation" in first
    assert first["profile_fit"] >= 0.0
    assert first["squad_complementarity"] >= 0.0


def test_ml_endpoints():
    # Archetypes endpoint
    arch_res = client.get("/api/v1/ml/archetypes")
    assert arch_res.status_code == 200
    archetypes = arch_res.json()
    assert isinstance(archetypes, list)
    assert len(archetypes) > 0
    assert "label" in archetypes[0]
    assert "leading_kpis" in archetypes[0]

    # Find a player to test similarity and archetype
    players_res = client.get("/api/v1/players?page_size=5")
    assert players_res.status_code == 200
    players = players_res.json()["items"]
    if players:
        p_id = players[0]["id"]
        sim_res = client.get(f"/api/v1/ml/similar/{p_id}?k=3")
        assert sim_res.status_code == 200
        sim_data = sim_res.json()
        assert isinstance(sim_data, list)

        p_arch_res = client.get(f"/api/v1/ml/archetype/{p_id}")
        assert p_arch_res.status_code == 200


def test_available_clubs_and_switching():
    # 1. Available clubs endpoint
    res = client.get("/api/v1/club/available")
    assert res.status_code == 200
    clubs = res.json()
    assert isinstance(clubs, list)
    assert len(clubs) == 18  # All 18 Bundesliga 2023/24 clubs

    # Verify each club item format
    for c in clubs:
        assert "name" in c
        assert "team_id" in c
        assert "primary_formation" in c
        assert "is_active" in c
        assert "squad_size" in c
        assert c["squad_size"] >= 20  # Every team has 20+ players in Bundesliga telemetry

    # 2. Switch to Bayern Munich
    bayern = next(c for c in clubs if "Bayern" in c["name"])
    bayern_switch_res = client.post(f"/api/v1/club/select/{bayern['team_id']}")
    assert bayern_switch_res.status_code == 200
    active_bayern = bayern_switch_res.json()
    assert "Bayern" in active_bayern["name"]
    assert active_bayern["is_active"] is True

    # 3. Verify squad assessment now reflects Bayern
    assessment_res = client.get("/api/v1/club/squad-assessment")
    assert assessment_res.status_code == 200
    assessment_data = assessment_res.json()
    assert "Bayern" in assessment_data["club_name"]
    assert assessment_data["total_squad_size"] >= 25

    # 4. Switch back to Bayer Leverkusen
    leverkusen = next(c for c in clubs if "Leverkusen" in c["name"])
    lev_switch_res = client.post(f"/api/v1/club/select/{leverkusen['team_id']}")
    assert lev_switch_res.status_code == 200
    active_lev = lev_switch_res.json()
    assert "Leverkusen" in active_lev["name"]
    assert active_lev["is_active"] is True

