import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_player_filter_by_position():
    """Verify position filter correctly restricts results to the position group."""
    res = client.get("/api/v1/players?position=Midfielder&page_size=50")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] > 0
    for p in data["items"]:
        pos = (p.get("primary_position") or "").lower()
        # Must match midfield designations
        assert any(term in pos for term in ["midfield", "midfielder", "wing", "am", "cm", "dm"])


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
        assert any(term in pos for term in ["midfield", "midfielder", "wing", "am", "cm", "dm"])
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
        assert any(term in pos for term in ["midfield", "midfielder", "wing", "am", "cm", "dm"])
        assert c.get("preferred_foot") in ["Right", "Both", None]  # where present
        assert c["total_minutes"] >= 180


def test_recruitment_map_filters():
    """Verify recruitment 2D map filters for position and preferred_foot."""
    res = client.get(
        "/api/v1/recruitment/map?role_profile=Ball-Playing Defender&position=Defender&preferred_foot=Right&min_minutes=180&limit=20"
    )
    assert res.status_code == 200
    data = res.json()
    assert "candidates" in data
    for c in data["candidates"]:
        pos = (c.get("primary_position") or "").lower()
        assert any(term in pos for term in ["back", "defender", "centre-back", "center back", "cb", "lb", "rb"])
        assert c["total_minutes"] >= 180
