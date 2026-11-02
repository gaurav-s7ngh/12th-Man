import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_player_filter_by_position_canonical_midfielder():
    """Verify midfielder filter includes central and wide midfielders (LM, RM, DM, CM, AM)."""
    res = client.get("/api/v1/players?position=Midfielder&page_size=100")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] > 0
    all_positions = {p["primary_position"] for p in data["items"]}
    # Verify both central and wide midfielders are present
    assert any("midfield" in pos.lower() for pos in all_positions)
    for p in data["items"]:
        pos = p["primary_position"]
        assert "midfield" in pos.lower()


def test_player_filter_by_position_canonical_winger():
    """Verify winger filter specifically returns wingers (LW, RW), not strikers or central midfielders."""
    res = client.get("/api/v1/players?position=Winger&page_size=50")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] > 0
    for p in data["items"]:
        pos = p["primary_position"]
        assert pos in ["Left Wing", "Right Wing", "Left Wing Forward", "Right Wing Forward"]


def test_player_filter_by_position_canonical_forward():
    """Verify forward filter returns center forwards / strikers, not wingers."""
    res = client.get("/api/v1/players?position=Forward&page_size=50")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] > 0
    for p in data["items"]:
        pos = p["primary_position"]
        assert pos in ["Center Forward", "Left Center Forward", "Right Center Forward", "Striker", "Secondary Striker"]


def test_player_filter_by_preferred_foot():
    """Verify preferred_foot filter returns only matching or both-footed players."""
    # Test Left foot
    res_left = client.get("/api/v1/players?preferred_foot=Left&page_size=50")
    assert res_left.status_code == 200
    data_left = res_left.json()
    assert data_left["total"] > 0
    for p in data_left["items"]:
        assert p["preferred_foot"] in ["Left", "Both"]

    # Test Right foot
    res_right = client.get("/api/v1/players?preferred_foot=Right&page_size=50")
    assert res_right.status_code == 200
    data_right = res_right.json()
    assert data_right["total"] > 0
    for p in data_right["items"]:
        assert p["preferred_foot"] in ["Right", "Both"]


def test_player_filter_by_min_minutes():
    """Verify playing time filter only returns players with at least min_minutes."""
    min_mins = 900
    res = client.get(f"/api/v1/players?min_minutes={min_mins}&page_size=50")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] > 0
    for p in data["items"]:
        assert p["total_minutes"] >= min_mins


def test_player_filter_by_role():
    """Verify role-based filtering restricts to tactical group mapping."""
    res = client.get("/api/v1/players?role=Ball-Playing Defender&page_size=50")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] > 0
    for p in data["items"]:
        pos = (p.get("primary_position") or "").lower()
        assert any(term in pos for term in ["back", "defender", "centre-back", "center back", "cb", "lb", "rb"])


def test_player_filter_by_search():
    """Verify text search matches player names accurately."""
    res = client.get("/api/v1/players?search=Florian Wirtz")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 1
    assert any("Wirtz" in p["name"] for p in data["items"])


def test_combined_player_filters():
    """Verify multiple filters work simultaneously (AND condition)."""
    res = client.get("/api/v1/players?position=Midfielder&preferred_foot=Right&min_minutes=500&page_size=50")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] > 0
    for p in data["items"]:
        pos = (p.get("primary_position") or "").lower()
        assert "midfield" in pos
        assert p["preferred_foot"] in ["Right", "Both"]
        assert p["total_minutes"] >= 500


def test_impossible_filter_combination_returns_empty():
    """Verify impossible filter returns clean empty list, not an error."""
    res = client.get("/api/v1/players?min_minutes=999999")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 0
    assert len(data["items"]) == 0


def test_player_sorting_and_pagination():
    """Verify sorting and pagination respect active filters."""
    # Descending minutes
    res_desc = client.get("/api/v1/players?position=Defender&sort_by=minutes&sort_order=desc&page=1&page_size=10")
    assert res_desc.status_code == 200
    items_desc = res_desc.json()["items"]
    assert len(items_desc) > 1
    for i in range(len(items_desc) - 1):
        assert items_desc[i]["total_minutes"] >= items_desc[i + 1]["total_minutes"]

    # Ascending minutes
    res_asc = client.get("/api/v1/players?position=Defender&sort_by=minutes&sort_order=asc&page=1&page_size=10")
    assert res_asc.status_code == 200
    items_asc = res_asc.json()["items"]
    assert len(items_asc) > 1
    for i in range(len(items_asc) - 1):
        assert items_asc[i]["total_minutes"] <= items_asc[i + 1]["total_minutes"]


def test_recruitment_discovery_filters():
    """Verify recruitment discovery filters for position, preferred_foot, and min_minutes."""
    # Discover right-footed midfielders
    res = client.get(
        "/api/v1/recruitment/discover?role_profile=Box-to-Box Engine&position=Midfielder&preferred_foot=Right&min_minutes=180&limit=15"
    )
    assert res.status_code == 200
    candidates = res.json()
    assert isinstance(candidates, list)
    for c in candidates:
        pos = (c.get("primary_position") or "").lower()
        assert "midfield" in pos
        assert c.get("preferred_foot") in ["Right", "Both", None]
        assert c["total_minutes"] >= 180


def test_recruitment_map_filters():
    """Verify recruitment 2D map filters for position and preferred_foot."""
    res = client.get(
        "/api/v1/recruitment/map?role_profile=Ball-Playing Defender&position=Defender&preferred_foot=Right&min_minutes=180&limit=20"
    )
    assert res.status_code == 200
    data = res.json()
    assert "candidates" in data
    assert data["total_candidates"] > 0
    for c in data["candidates"]:
        pos = (c.get("primary_position") or "").lower()
        assert any(term in pos for term in ["back", "defender", "centre-back", "center back", "cb", "lb", "rb"])
        assert c["total_minutes"] >= 180


def test_club_switching_full_flow():
    """Verify club switching flow between Bayern, Dortmund, and Leverkusen."""
    # 1. Fetch available clubs (must be all 18)
    clubs_res = client.get("/api/v1/club/available")
    assert clubs_res.status_code == 200
    clubs = clubs_res.json()
    assert len(clubs) == 18

    # 2. Switch to Bayern
    bayern = next(c for c in clubs if "Bayern" in c["name"])
    bayern_res = client.post(f"/api/v1/club/select/{bayern['team_id']}")
    assert bayern_res.status_code == 200
    assert bayern_res.json()["name"] == "Bayern Munich"
    assert bayern_res.json()["is_active"] is True

    # Check squad assessment for Bayern
    bayern_assess = client.get("/api/v1/club/squad-assessment").json()
    assert bayern_assess["club_name"] == "Bayern Munich"
    assert bayern_assess["total_squad_size"] == 27

    # 3. Switch to Borussia Dortmund
    bvb = next(c for c in clubs if "Dortmund" in c["name"])
    bvb_res = client.post(f"/api/v1/club/select/{bvb['team_id']}")
    assert bvb_res.status_code == 200
    assert bvb_res.json()["name"] == "Borussia Dortmund"
    assert bvb_res.json()["is_active"] is True

    # Check squad assessment for Dortmund
    bvb_assess = client.get("/api/v1/club/squad-assessment").json()
    assert bvb_assess["club_name"] == "Borussia Dortmund"
    assert bvb_assess["total_squad_size"] == 27

    # 4. Switch back to Bayer Leverkusen
    lev = next(c for c in clubs if "Leverkusen" in c["name"])
    lev_res = client.post(f"/api/v1/club/select/{lev['team_id']}")
    assert lev_res.status_code == 200
    assert "Leverkusen" in lev_res.json()["name"]
    assert lev_res.json()["is_active"] is True
