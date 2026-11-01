# 12th Man — StatsBomb Open Data Ingestion

## 1. Selected Dataset Scope
Based on metadata analysis across all 80 competition/season entries in StatsBomb Open Data, **UEFA Euro 2024** was selected:

- **Competition**: UEFA Euro
- **Season**: 2024
- **StatsBomb Competition ID**: `55`
- **StatsBomb Season ID**: `282`
- **Total Matches**: `51`
- **Lineup Coverage**: 100% (all 51 matches have complete starting XIs and substitutes)
- **Event Coverage**: 100% (complete high-density event streams)

### Why Euro 2024?
1. **Modern Player Pool**: Contains current active top-tier players (Lamine Yamal, Jude Bellingham, Rodri, Nico Williams, Florian Wirtz, Jamal Musiala, Bukayo Saka, etc.) who are relevant for real-world recruitment intelligence.
2. **Complete Tournament Structure**: Full group stage, round of 16, quarter-finals, semi-finals, and final.
3. **Data Completeness**: Zero missing event streams; complete lineups with shirt numbers and substitution minutes.
4. **Focused Volume**: High event density (187,924 telemetry events) sufficient for rigorous statistical derivation and per-90 metrics without requiring hours to ingest.

---

## 2. Ingestion Pipeline Execution
The ingestion pipeline is implemented in `backend/app/ingestion/statsbomb/`:

1. **`fetcher.py`**: Downloads and caches raw JSON files to `backend/data/statsbomb_cache/` so re-runs or offline runs operate without re-downloading.
2. **`parser.py`**: Extracts normalized entity mappings, dates, durations, and structured event attributes.
3. **`aggregates.py`**: Computes match-level player statistics strictly derived from the underlying events (shots, xG, completed passes, key passes, tackles, duels, interceptions, clearances, fouls, cards).
4. **`pipeline.py`**: Coordinates the multi-match execution with PostgreSQL bulk inserts and transactional integrity.
5. **`cli.py`**: Command-line entrypoint.

### Ingestion Results (Verified in PostgreSQL)
- **Matches processed**: 51 / 51
- **Teams created**: 24
- **Players created**: 621
- **Player appearances**: 2,587
- **Match events inserted**: 187,924
- **Player-match stats records**: 2,587
- **Failed imports**: 0

---

## 3. Mandatory Attribution
This dataset uses public match data provided by StatsBomb under the StatsBomb Open Data Licence.

> **Data provided by StatsBomb**
> 
> Website: [https://statsbomb.com](https://statsbomb.com)
> 
> Repository: [https://github.com/statsbomb/open-data](https://github.com/statsbomb/open-data)
