import argparse
import sys

from app.db.session import SessionLocal
from app.ingestion.statsbomb.pipeline import StatsBombIngestionPipeline


def main():
    parser = argparse.ArgumentParser(description="Ingest StatsBomb Open Data into 12th Man")
    parser.add_argument(
        "--competition-id",
        type=int,
        default=55,
        help="StatsBomb competition ID (default: 55 for UEFA Euro)",
    )
    parser.add_argument(
        "--season-id",
        type=int,
        default=282,
        help="StatsBomb season ID (default: 282 for 2024)",
    )
    parser.add_argument(
        "--max-matches",
        type=int,
        default=None,
        help="Maximum matches to process (default: all)",
    )
    parser.add_argument(
        "--reimport",
        action="store_true",
        help="Reimport existing matches (overwriting them)",
    )

    args = parser.parse_args()

    db = SessionLocal()
    try:
        pipeline = StatsBombIngestionPipeline(db=db)
        report = pipeline.run(
            competition_id=args.competition_id,
            season_id=args.season_id,
            max_matches=args.max_matches,
            reimport=args.reimport,
        )
        if report["errors"]:
            print(f"Ingestion finished with {len(report['errors'])} errors.")
            sys.exit(1)
        else:
            print("Ingestion completed successfully.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
