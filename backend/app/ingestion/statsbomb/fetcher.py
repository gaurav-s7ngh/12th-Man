import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional
import urllib.request
import urllib.error

logger = logging.getLogger(__name__)

BASE_URL = "https://raw.githubusercontent.com/statsbomb/open-data/master/data"


class StatsBombFetcher:
    """
    Fetches StatsBomb open data files from GitHub with local file caching.
    Ensures safe, repeatable and offline-capable ingestion.
    """

    def __init__(self, cache_dir: Optional[Path] = None):
        if cache_dir is None:
            # Default to backend/data/statsbomb_cache
            self.cache_dir = Path(__file__).resolve().parent.parent.parent.parent / "data" / "statsbomb_cache"
        else:
            self.cache_dir = Path(cache_dir)

        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def _get_json(self, rel_path: str) -> Any:
        local_path = self.cache_dir / rel_path
        if local_path.exists():
            with open(local_path, "r", encoding="utf-8") as f:
                return json.load(f)

        url = f"{BASE_URL}/{rel_path}"
        logger.info(f"Downloading {url} to {local_path}...")
        local_path.parent.mkdir(parents=True, exist_ok=True)

        req = urllib.request.Request(
            url,
            headers={"User-Agent": "12thMan-Football-Scouting/1.0"}
        )
        try:
            with urllib.request.urlopen(req) as resp:
                content = resp.read().decode("utf-8")
                data = json.loads(content)
                with open(local_path, "w", encoding="utf-8") as f:
                    f.write(content)
                return data
        except urllib.error.HTTPError as e:
            logger.error(f"HTTP error {e.code} fetching {url}: {e.reason}")
            raise
        except Exception as e:
            logger.error(f"Error fetching {url}: {e}")
            raise

    def get_competitions(self) -> List[Dict[str, Any]]:
        return self._get_json("competitions.json")

    def get_matches(self, competition_id: int, season_id: int) -> List[Dict[str, Any]]:
        return self._get_json(f"matches/{competition_id}/{season_id}.json")

    def get_lineup(self, match_id: int) -> List[Dict[str, Any]]:
        return self._get_json(f"lineups/{match_id}.json")

    def get_events(self, match_id: int) -> List[Dict[str, Any]]:
        return self._get_json(f"events/{match_id}.json")
