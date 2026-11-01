import sys
import os
sys.path.insert(0, os.path.abspath("."))
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from app.db.session import SessionLocal
from app.services.ml_service import MLService
from ml.evaluation.metrics import evaluate_clustering

db = SessionLocal()
print("--- RETRAINING ML MODELS ON BUNDESLIGA DATASET ---")
MLService.reset_models()
ml_service = MLService(db)

# Load Bundesliga players and train
records = ml_service._load_player_stats_records(min_minutes=90)
print(f"Total Bundesliga players meeting min 90m threshold: {len(records)}")

# Trigger fit
archetypes = ml_service.get_archetypes()
print(f"\nDiscovered {len(archetypes)} Tactical Archetypes:")
for arch in archetypes:
    print(f"Cluster {arch['cluster_id']}: {arch['label']} ({arch['percentage_of_pool']}% of pool)")
    print(f"  Description: {arch['description']}")
    print(f"  Leading KPIs: {arch['leading_kpis']}")

# Evaluate clustering quality
clusterer = MLService._clusterer
df = clusterer.fitted_df
from ml.features.feature_extractor import FEATURE_COLUMNS
X_scaled = clusterer.scaler.transform(df[FEATURE_COLUMNS].to_numpy())
eval_res = evaluate_clustering(X_scaled, clusterer.kmeans.labels_)
print(f"\nRetrained Clustering Quality: {eval_res}")

# Test similarity on a prominent Bundesliga player (e.g. Florian Wirtz, Granit Xhaka)
wirtz_rec = next((r for r in records if "Wirtz" in r["player_name"]), None)
if wirtz_rec:
    print(f"\nTesting k-NN Similarity for: {wirtz_rec['player_name']} (ID: {wirtz_rec['player_id']})")
    similar = ml_service.get_similar_players(wirtz_rec["player_id"], k=4)
    for s in similar:
        name = s['player_name'].encode('ascii', errors='replace').decode('ascii')
        print(f"  -> {name} ({s['primary_position']}, {s['nationality']}): {s['similarity_score']}% match")
        print(f"     Shared traits: {s['shared_traits']}")

xhaka_rec = next((r for r in records if "Xhaka" in r["player_name"]), None)
if xhaka_rec:
    print(f"\nTesting k-NN Similarity for: {xhaka_rec['player_name']} (ID: {xhaka_rec['player_id']})")
    similar = ml_service.get_similar_players(xhaka_rec["player_id"], k=4)
    for s in similar:
        name = s['player_name'].encode('ascii', errors='replace').decode('ascii')
        print(f"  -> {name} ({s['primary_position']}, {s['nationality']}): {s['similarity_score']}% match")
        print(f"     Shared traits: {s['shared_traits']}")

db.close()
