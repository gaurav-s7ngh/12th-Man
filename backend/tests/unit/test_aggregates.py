import uuid
import pytest
from app.ingestion.statsbomb.aggregates import compute_player_match_stats


def test_compute_player_match_stats_full():
    player_id = uuid.uuid4()
    match_id = uuid.uuid4()
    team_id = uuid.uuid4()

    events = [
        # 1 goal shot
        {
            "type": {"name": "Shot"},
            "period": 1,
            "shot": {"statsbomb_xg": 0.45, "outcome": {"name": "Goal"}},
        },
        # 1 saved shot
        {
            "type": {"name": "Shot"},
            "period": 2,
            "shot": {"statsbomb_xg": 0.15, "outcome": {"name": "Saved"}},
        },
        # 1 off target shot
        {
            "type": {"name": "Shot"},
            "period": 2,
            "shot": {"statsbomb_xg": 0.05, "outcome": {"name": "Off T"}},
        },
        # 2 complete passes (one assist)
        {
            "type": {"name": "Pass"},
            "period": 1,
            "pass": {"goal_assist": True, "outcome": None},
        },
        {
            "type": {"name": "Pass"},
            "period": 1,
            "pass": {"shot_assist": True, "outcome": None},
        },
        # 1 incomplete pass
        {
            "type": {"name": "Pass"},
            "period": 2,
            "pass": {"outcome": {"name": "Incomplete"}},
        },
        # 1 tackle won
        {
            "type": {"name": "Duel"},
            "period": 1,
            "duel": {"type": {"name": "Tackle"}, "outcome": {"name": "Won"}},
        },
        # 1 interception
        {
            "type": {"name": "Interception"},
            "period": 1,
        },
        # 1 clearance
        {
            "type": {"name": "Clearance"},
            "period": 2,
        },
        # 1 yellow card foul
        {
            "type": {"name": "Foul Committed"},
            "period": 2,
            "foul_committed": {"card": {"name": "Yellow Card"}},
        },
    ]

    stats = compute_player_match_stats(
        player_id=player_id,
        match_id=match_id,
        team_id=team_id,
        appearance_minutes=90,
        events=events,
    )

    assert stats["minutes_played"] == 90
    assert stats["goals"] == 1
    assert stats["assists"] == 1
    assert stats["shots"] == 3
    assert stats["shots_on_target"] == 2  # Goal + Saved
    assert stats["passes_attempted"] == 3
    assert stats["passes_completed"] == 2
    assert stats["key_passes"] == 2
    assert stats["tackles"] == 1
    assert stats["duels_won"] == 1
    assert stats["interceptions"] == 1
    assert stats["clearances"] == 1
    assert stats["fouls_committed"] == 1
    assert stats["yellow_cards"] == 1
    assert stats["red_cards"] == 0
    assert stats["xg"] == 0.65  # 0.45 + 0.15 + 0.05
    assert stats["touches"] == len(events)
