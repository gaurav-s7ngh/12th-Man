import sys
import pathlib

backend_dir = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(backend_dir))

from app.db.session import SessionLocal
from app.models.football import MatchEvent, Player
from sqlalchemy import select, func

def populate_preferred_feet():
    db = SessionLocal()
    print("Computing preferred foot from match event telemetry (passes + shots)...")
    
    query = (
        select(
            MatchEvent.player_id,
            func.count().filter(MatchEvent.raw_payload['pass']['body_part']['name'].as_string() == 'Right Foot') +
            func.count().filter(MatchEvent.raw_payload['shot']['body_part']['name'].as_string() == 'Right Foot'),
            func.count().filter(MatchEvent.raw_payload['pass']['body_part']['name'].as_string() == 'Left Foot') +
            func.count().filter(MatchEvent.raw_payload['shot']['body_part']['name'].as_string() == 'Left Foot'),
        )
        .where(MatchEvent.player_id.isnot(None))
        .group_by(MatchEvent.player_id)
    )
    
    results = db.execute(query).all()
    
    updated = 0
    feet_counts = {"Right": 0, "Left": 0, "Both": 0}
    
    for pid, r, l in results:
        tot = (r or 0) + (l or 0)
        if tot >= 4:
            if r / tot >= 0.70:
                foot = "Right"
            elif l / tot >= 0.70:
                foot = "Left"
            else:
                foot = "Both"
            
            player = db.execute(select(Player).where(Player.id == pid)).scalar_one_or_none()
            if player:
                player.preferred_foot = foot
                feet_counts[foot] += 1
                updated += 1
    
    db.commit()
    print(f"Successfully updated preferred_foot for {updated} players:")
    for k, v in feet_counts.items():
        print(f"  {k}: {v}")
    db.close()

if __name__ == "__main__":
    populate_preferred_feet()
