import pathlib
import sys
import pytest

PROJECT_ROOT = str(pathlib.Path(__file__).resolve().parents[3])
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ml.features.feature_extractor import FeatureExtractor, PositionCohort
from ml.recruitment.similarity import PlayerSimilarityEngine
from ml.clustering.archetypes import TacticalArchetypeClusterer


def test_feature_extractor_mapping():
    assert FeatureExtractor.map_position_cohort("Center Back") == PositionCohort.DEFENDER
    assert FeatureExtractor.map_position_cohort("Left Wing Back") == PositionCohort.DEFENDER
    assert FeatureExtractor.map_position_cohort("Center Defensive Midfield") == PositionCohort.MIDFIELDER
    assert FeatureExtractor.map_position_cohort("Center Forward") == PositionCohort.FORWARD
    assert FeatureExtractor.map_position_cohort("Goalkeeper") == PositionCohort.GOALKEEPER


def test_similarity_and_clustering_synthetic():
    # Build synthetic sample records
    dummy_records = []
    for i in range(20):
        dummy_records.append({
            "player_id": f"p-{i}",
            "player_name": f"Player {i}",
            "primary_position": "Center Midfield" if i % 2 == 0 else "Center Forward",
            "nationality": "Germany",
            "total_minutes": 900,
            "goals": (i % 5),
            "assists": (i % 4),
            "shots": i,
            "shots_on_target": i // 2,
            "passes_completed": 400 + i * 10,
            "passes_attempted": 500 + i * 10,
            "key_passes": i,
            "tackles": 20 + i,
            "interceptions": 15 + i,
            "clearances": 5 + i,
            "aerials_won": 10 + i,
            "dribbles_completed": 5 + (i % 3),
            "duels_won": 30 + i,
            "touches": 600 + i * 15,
            "xg": float(i % 5) * 0.35,
        })

    # Test similarity engine
    engine = PlayerSimilarityEngine(min_minutes=90)
    engine.fit(dummy_records)
    sims = engine.find_similar("p-0", k=3)
    assert len(sims) == 3
    assert sims[0]["player_id"] != "p-0"
    assert "similarity_score" in sims[0]

    # Test clusterer
    clusterer = TacticalArchetypeClusterer(n_clusters=3)
    clusterer.fit(dummy_records)
    summary = clusterer.get_archetypes_summary()
    assert len(summary) == 3
    assert "label" in summary[0]
