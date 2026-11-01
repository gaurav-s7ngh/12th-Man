from collections import defaultdict
from datetime import datetime
import logging
from typing import Any, Dict, List, Optional, Tuple
import uuid

from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.ingestion.statsbomb.aggregates import compute_player_match_stats
from app.ingestion.statsbomb.fetcher import StatsBombFetcher
from app.ingestion.statsbomb.parser import (
    calculate_minutes_from_positions,
    extract_event_attributes,
    parse_match_date,
)
from app.models.football import (
    Competition,
    DataSource,
    Match,
    MatchEvent,
    Player,
    PlayerAppearance,
    PlayerMatchStats,
    Season,
    Team,
)

logger = logging.getLogger(__name__)


class StatsBombIngestionPipeline:
    def __init__(
        self,
        db: Session,
        fetcher: Optional[StatsBombFetcher] = None,
        batch_size: int = 1000,
    ):
        self.db = db
        self.fetcher = fetcher or StatsBombFetcher()
        self.batch_size = batch_size

        # In-memory external_id to internal UUID maps for current session
        self.team_cache: Dict[str, uuid.UUID] = {}
        self.player_cache: Dict[str, uuid.UUID] = {}

    def _ensure_team(self, team_ext_id: str, name: str, country: Optional[str] = None, gender: Optional[str] = None) -> uuid.UUID:
        if team_ext_id in self.team_cache:
            return self.team_cache[team_ext_id]

        existing = self.db.execute(
            select(Team).where(Team.external_id == str(team_ext_id))
        ).scalar_one_or_none()

        if existing:
            self.team_cache[team_ext_id] = existing.id
            return existing.id

        team = Team(
            external_id=str(team_ext_id),
            name=name,
            country=country,
            gender=gender,
        )
        self.db.add(team)
        self.db.flush()
        self.team_cache[team_ext_id] = team.id
        return team.id

    def _ensure_player(
        self,
        player_ext_id: str,
        name: str,
        nationality: Optional[str] = None,
        primary_position: Optional[str] = None,
        birth_date=None,
    ) -> uuid.UUID:
        if player_ext_id in self.player_cache:
            return self.player_cache[player_ext_id]

        existing = self.db.execute(
            select(Player).where(Player.external_id == str(player_ext_id))
        ).scalar_one_or_none()

        if existing:
            # Update position / nationality if not set
            updated = False
            if not existing.primary_position and primary_position:
                existing.primary_position = primary_position
                updated = True
            if not existing.nationality and nationality:
                existing.nationality = nationality
                updated = True
            if updated:
                self.db.flush()
            self.player_cache[player_ext_id] = existing.id
            return existing.id

        player = Player(
            external_id=str(player_ext_id),
            name=name,
            nationality=nationality,
            primary_position=primary_position,
            birth_date=birth_date,
        )
        self.db.add(player)
        self.db.flush()
        self.player_cache[player_ext_id] = player.id
        return player.id

    def run(
        self,
        competition_id: int = 55,
        season_id: int = 282,
        max_matches: Optional[int] = None,
        reimport: bool = False,
    ) -> Dict[str, Any]:
        """
        Executes full ingestion pipeline for the specified competition and season.
        """
        print(f"=== Starting StatsBomb Ingestion: Competition {competition_id}, Season {season_id} ===")

        # 1. Fetch competition and match list
        competitions = self.fetcher.get_competitions()
        comp_meta = next(
            (c for c in competitions if c["competition_id"] == competition_id and c["season_id"] == season_id),
            None,
        )
        if not comp_meta:
            raise ValueError(f"Competition {competition_id} Season {season_id} not found in StatsBomb competitions.json")

        comp_name = comp_meta["competition_name"]
        season_name = comp_meta["season_name"]
        country_name = comp_meta.get("country_name")

        # 2. Upsert Competition & Season
        comp = self.db.execute(
            select(Competition).where(Competition.external_id == str(competition_id))
        ).scalar_one_or_none()

        if not comp:
            comp = Competition(
                external_id=str(competition_id),
                name=comp_name,
                country=country_name,
                gender="male",
            )
            self.db.add(comp)
            self.db.flush()

        season = self.db.execute(
            select(Season).where(
                Season.competition_id == comp.id,
                Season.name == season_name,
            )
        ).scalar_one_or_none()

        if not season:
            start_yr = int(season_name[:4]) if season_name[:4].isdigit() else None
            season = Season(
                external_id=str(season_id),
                competition_id=comp.id,
                name=season_name,
                start_year=start_yr,
                end_year=start_yr,
            )
            self.db.add(season)
            self.db.flush()

        # 3. Create or get DataSource entry
        data_source = DataSource(
            provider_name="StatsBomb",
            dataset_identifier=f"{comp_name} {season_name} ({competition_id}/{season_id})",
            import_timestamp=datetime.utcnow(),
            status="in_progress",
            source_provenance={
                "repository": "https://github.com/statsbomb/open-data",
                "attribution": "StatsBomb Open Data (https://statsbomb.com)",
                "competition_id": competition_id,
                "season_id": season_id,
                "competition_name": comp_name,
                "season_name": season_name,
            },
        )
        self.db.add(data_source)
        self.db.commit()

        # 4. Fetch all matches
        matches_data = self.fetcher.get_matches(competition_id, season_id)
        total_matches = len(matches_data)
        if max_matches:
            matches_data = matches_data[:max_matches]

        print(f"Loaded {len(matches_data)} matches (out of {total_matches} available) to process.")

        stats_report = {
            "competition": comp_name,
            "season": season_name,
            "external_competition_id": competition_id,
            "external_season_id": season_id,
            "total_matches_available": total_matches,
            "matches_processed": 0,
            "matches_skipped": 0,
            "total_events_inserted": 0,
            "total_appearances_inserted": 0,
            "total_player_stats_inserted": 0,
            "unique_players_created": 0,
            "unique_teams_created": 0,
            "errors": [],
        }

        # 5. Process matches
        for idx, m_dict in enumerate(matches_data, 1):
            m_ext_id = str(m_dict["match_id"])
            home_info = m_dict["home_team"]
            away_info = m_dict["away_team"]
            m_date_str = m_dict["match_date"]
            m_time_str = m_dict.get("kick_off")

            print(f"[{idx}/{len(matches_data)}] Match {m_ext_id}: {home_info['home_team_name']} vs {away_info['away_team_name']} ({m_date_str})...")

            # Check if match already ingested
            existing_match = self.db.execute(
                select(Match).where(Match.external_id == m_ext_id)
            ).scalar_one_or_none()

            if existing_match and not reimport:
                print(f"  Match {m_ext_id} already exists. Skipping.")
                stats_report["matches_skipped"] += 1
                continue

            if existing_match and reimport:
                # Clean up existing child rows for this match
                self.db.execute(delete(MatchEvent).where(MatchEvent.match_id == existing_match.id))
                self.db.execute(delete(PlayerMatchStats).where(PlayerMatchStats.match_id == existing_match.id))
                self.db.execute(delete(PlayerAppearance).where(PlayerAppearance.match_id == existing_match.id))
                self.db.flush()

            try:
                # Ensure Teams
                home_team_id = self._ensure_team(
                    str(home_info["home_team_id"]),
                    home_info["home_team_name"],
                    country=home_info.get("country", {}).get("name"),
                    gender=home_info.get("home_team_gender"),
                )
                away_team_id = self._ensure_team(
                    str(away_info["away_team_id"]),
                    away_info["away_team_name"],
                    country=away_info.get("country", {}).get("name"),
                    gender=away_info.get("away_team_gender"),
                )

                m_date, m_datetime = parse_match_date(m_date_str, m_time_str)

                if existing_match:
                    match_obj = existing_match
                    match_obj.home_score = m_dict.get("home_score")
                    match_obj.away_score = m_dict.get("away_score")
                    match_obj.match_status = m_dict.get("match_status", "available")
                    match_obj.match_metadata = m_dict
                else:
                    match_obj = Match(
                        external_id=m_ext_id,
                        competition_id=comp.id,
                        season_id=season.id,
                        home_team_id=home_team_id,
                        away_team_id=away_team_id,
                        match_date=m_date,
                        match_datetime=m_datetime,
                        home_score=m_dict.get("home_score"),
                        away_score=m_dict.get("away_score"),
                        match_status=m_dict.get("match_status", "available"),
                        match_metadata=m_dict,
                    )
                    self.db.add(match_obj)
                    self.db.flush()

                # 6. Fetch & Parse Lineups
                lineups_data = self.fetcher.get_lineup(int(m_ext_id))
                appearance_records = []
                player_appearance_map: Dict[uuid.UUID, Dict[str, Any]] = {}

                for team_lineup in lineups_data:
                    t_ext_id = str(team_lineup["team_id"])
                    t_uuid = self.team_cache.get(t_ext_id) or self._ensure_team(
                        t_ext_id, team_lineup["team_name"]
                    )

                    for p_entry in team_lineup.get("lineup", []):
                        p_ext_id = str(p_entry["player_id"])
                        p_name = p_entry["player_name"]
                        p_nat = p_entry.get("country", {}).get("name")
                        positions = p_entry.get("positions", [])
                        shirt_no = p_entry.get("jersey_number")

                        # Primary position in this match
                        first_pos = positions[0].get("position") if positions else None
                        is_starter = any(pos.get("start_reason") == "Starting XI" or pos.get("from") == "00:00" for pos in positions)
                        is_sub = not is_starter and len(positions) > 0
                        mins = calculate_minutes_from_positions(positions)

                        p_uuid = self._ensure_player(
                            player_ext_id=p_ext_id,
                            name=p_name,
                            nationality=p_nat,
                            primary_position=first_pos,
                        )

                        # Only add appearance if player played or was in lineup squad
                        appearance_obj = PlayerAppearance(
                            player_id=p_uuid,
                            match_id=match_obj.id,
                            team_id=t_uuid,
                            is_starter=is_starter,
                            is_substitute=is_sub,
                            minutes_played=mins,
                            shirt_number=shirt_no,
                            position=first_pos,
                            external_id=f"{m_ext_id}_{p_ext_id}",
                        )
                        appearance_records.append(appearance_obj)
                        player_appearance_map[p_uuid] = {
                            "team_id": t_uuid,
                            "minutes": mins,
                            "is_starter": is_starter,
                            "is_sub": is_sub,
                            "position": first_pos,
                        }

                self.db.add_all(appearance_records)
                self.db.flush()
                stats_report["total_appearances_inserted"] += len(appearance_records)

                # 7. Fetch & Parse Events
                events_data = self.fetcher.get_events(int(m_ext_id))
                events_by_player: Dict[uuid.UUID, List[Dict[str, Any]]] = defaultdict(list)
                event_mappings = []

                for ev in events_data:
                    ev_ext_id = ev["id"]
                    ev_type = ev.get("type", {}).get("name", "Unknown")
                    period = ev.get("period")
                    timestamp = ev.get("timestamp")
                    minute = ev.get("minute")
                    second = ev.get("second")
                    loc = ev.get("location")
                    loc_x = float(loc[0]) if loc and len(loc) >= 1 else None
                    loc_y = float(loc[1]) if loc and len(loc) >= 2 else None

                    # Player mapping
                    ev_player = ev.get("player")
                    p_uuid = None
                    if ev_player:
                        p_ext = str(ev_player["id"])
                        p_uuid = self.player_cache.get(p_ext) or self._ensure_player(
                            p_ext, ev_player.get("name", "Unknown Player")
                        )
                        events_by_player[p_uuid].append(ev)

                    # Team mapping
                    ev_team = ev.get("team")
                    t_uuid = None
                    if ev_team:
                        t_ext = str(ev_team["id"])
                        t_uuid = self.team_cache.get(t_ext) or self._ensure_team(
                            t_ext, ev_team.get("name", "Unknown Team")
                        )

                    attrs = extract_event_attributes(ev)

                    event_mappings.append({
                        "id": uuid.uuid4(),
                        "external_id": ev_ext_id,
                        "match_id": match_obj.id,
                        "player_id": p_uuid,
                        "team_id": t_uuid,
                        "event_type": ev_type,
                        "period": period,
                        "timestamp": timestamp,
                        "minute": minute,
                        "second": second,
                        "location_x": loc_x,
                        "location_y": loc_y,
                        "attributes": attrs,
                        "raw_payload": ev,
                        "created_at": datetime.utcnow(),
                    })

                # Bulk insert events in chunks
                for i in range(0, len(event_mappings), self.batch_size):
                    chunk = event_mappings[i : i + self.batch_size]
                    self.db.execute(insert(MatchEvent), chunk)

                stats_report["total_events_inserted"] += len(event_mappings)

                # 8. Compute and insert PlayerMatchStats
                stat_mappings = []
                for p_uuid, app_info in player_appearance_map.items():
                    # Calculate stats even if player had 0 events (e.g. sub on late)
                    p_events = events_by_player.get(p_uuid, [])
                    p_stats = compute_player_match_stats(
                        player_id=p_uuid,
                        match_id=match_obj.id,
                        team_id=app_info["team_id"],
                        appearance_minutes=app_info["minutes"],
                        events=p_events,
                    )
                    stat_mappings.append(p_stats)

                for stat_dict in stat_mappings:
                    stat_obj = PlayerMatchStats(**stat_dict)
                    self.db.add(stat_obj)

                stats_report["total_player_stats_inserted"] += len(stat_mappings)

                self.db.commit()
                stats_report["matches_processed"] += 1
                print(f"  Saved match {m_ext_id}: {len(appearance_records)} appearances, {len(event_mappings)} events, {len(stat_mappings)} stats.")

            except Exception as e:
                self.db.rollback()
                logger.error(f"Failed processing match {m_ext_id}: {e}", exc_info=True)
                stats_report["errors"].append({"match_id": m_ext_id, "error": str(e)})
                print(f"  ERROR processing match {m_ext_id}: {e}")

        # Update DataSource record
        stats_report["unique_players_created"] = len(self.player_cache)
        stats_report["unique_teams_created"] = len(self.team_cache)

        data_source.status = "completed" if not stats_report["errors"] else "completed_with_errors"
        data_source.records_ingested = stats_report
        self.db.commit()

        print("=== StatsBomb Ingestion Completed ===")
        print(f"Matches processed: {stats_report['matches_processed']}/{len(matches_data)}")
        print(f"Total events: {stats_report['total_events_inserted']}")
        print(f"Total appearances: {stats_report['total_appearances_inserted']}")
        print(f"Total player match stats: {stats_report['total_player_stats_inserted']}")
        print(f"Unique players: {stats_report['unique_players_created']}")
        print(f"Unique teams: {stats_report['unique_teams_created']}")
        if stats_report["errors"]:
            print(f"Errors count: {len(stats_report['errors'])}")

        return stats_report
