import pytest
from app.ingestion.statsbomb.parser import (
    calculate_minutes_from_positions,
    extract_event_attributes,
    parse_match_date,
)


def test_parse_match_date_date_only():
    d, dt = parse_match_date("2024-06-18")
    assert d.year == 2024
    assert d.month == 6
    assert d.day == 18
    assert dt is None


def test_parse_match_date_with_time():
    d, dt = parse_match_date("2024-06-18", "21:00:00")
    assert d.year == 2024
    assert dt is not None
    assert dt.hour == 21
    assert dt.minute == 0


def test_calculate_minutes_from_positions_full_match():
    positions = [
        {"position": "Right Wing", "from": "00:00", "to": "90:00"}
    ]
    mins = calculate_minutes_from_positions(positions)
    assert mins == 90


def test_calculate_minutes_from_positions_sub_on():
    positions = [
        {"position": "Left Center Forward", "from": "60:00", "to": "90:00"}
    ]
    mins = calculate_minutes_from_positions(positions)
    assert mins == 30


def test_calculate_minutes_empty():
    assert calculate_minutes_from_positions([]) == 0


def test_extract_event_attributes_shot():
    event = {
        "type": {"name": "Shot"},
        "shot": {
            "statsbomb_xg": 0.35,
            "outcome": {"name": "Goal"},
            "technique": {"name": "Normal"},
            "body_part": {"name": "Left Foot"},
            "key_pass_id": "pass-uuid-123",
        },
    }
    attrs = extract_event_attributes(event)
    assert attrs["xg"] == 0.35
    assert attrs["outcome"] == "Goal"
    assert attrs["body_part"] == "Left Foot"
    assert attrs["key_pass_id"] == "pass-uuid-123"


def test_extract_event_attributes_pass():
    event = {
        "type": {"name": "Pass"},
        "pass": {
            "length": 25.4,
            "recipient": {"name": "Jude Bellingham", "id": 10955},
            "cross": True,
            "goal_assist": True,
        },
    }
    attrs = extract_event_attributes(event)
    assert attrs["length"] == 25.4
    assert attrs["recipient"] == "Jude Bellingham"
    assert attrs["is_cross"] is True
    assert attrs["goal_assist"] is True
    assert attrs["outcome"] is None  # Complete pass
