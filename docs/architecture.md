# 12th Man — Architecture Documentation

## 1. Overview
**12th Man** is a football scouting, analytics and recruitment intelligence platform designed to deliver professional-grade decision-support intelligence for scouts, performance analysts, and sporting directors.

The system is constructed as a high-performance **modular monolith** with a decoupled modern React TypeScript frontend.

```
       +-----------------------------------------------+
       |             Vite + React Frontend             |
       |  (Tailwind CSS v4, TanStack Query, Recharts)  |
       +-----------------------+-----------------------+
                               |  HTTP / REST
                               v
       +-----------------------------------------------+
       |               FastAPI Application             |
       |  +-----------------------------------------+  |
       |  | API Layer (/api/v1)                     |  |
       |  +--------------------+--------------------+  |
       |                       |                       |
       |  +--------------------v--------------------+  |
       |  | Service Layer (Business Logic)          |  |
       |  +--------------------+--------------------+  |
       |                       |                       |
       |  +--------------------v--------------------+  |
       |  | Repository Layer (Database Access)      |  |
       |  +--------------------+--------------------+  |
       |                       |                       |
       |  +--------------------v--------------------+  |
       |  | Models & SQLAlchemy 2.x ORM             |  |
       |  +-----------------------------------------+  |
       +-----------------------+-----------------------+
                               |  Psycopg 3
                               v
       +-----------------------------------------------+
       |                 PostgreSQL 18                 |
       |  (Relational Tables + Event Telemetry JSONB)  |
       +-----------------------------------------------+
```

---

## 2. Directory Layout & Layer Responsibilities

```
backend/
  app/
    api/
      routes/
        competitions.py     # Competitions and seasons endpoints
        health.py           # Application and database health probes
        matches.py          # Match schedule, metadata, and detail
        players.py          # Player discovery, profile, statistics, and reports
        shortlists.py       # Recruitment shortlist management
        teams.py            # Participating squads and rosters
    core/
      config.py           # Pydantic BaseSettings loading from .env
    db/
      base.py             # DeclarativeBase for SQLAlchemy 2.x
      session.py          # Engine & SessionLocal factory
    models/
      football.py         # Football domain models
      scouting.py         # Scouting and recruitment domain models
    schemas/
      common.py           # Generic pagination models
      football.py         # Football DTOs & response schemas
      scouting.py         # Scouting report and shortlist DTOs
    services/
      match_service.py    # Match and competition queries & orchestration
      player_service.py   # Player query pagination and stats aggregation
      scouting_service.py # Scouting reports and shortlists business logic
      team_service.py     # Team profiles and rosters
    repositories/
      match.py            # Match and competition SQL queries
      player.py           # Player search, filtering, and stats rollups
      scouting.py         # Scouting and shortlist SQL operations
      team.py             # Team data access
    ingestion/
      statsbomb/
        aggregates.py     # Telemetry performance metrics derivation
        cli.py            # CLI entrypoint for ingestion
        fetcher.py        # Local cache + GitHub raw fetcher
        parser.py         # Lineup, match, and event parsers
        pipeline.py       # Idempotent bulk upsert pipeline
    main.py               # FastAPI application setup & CORS configuration
  migrations/             # Alembic versioned migrations
  tests/
    unit/                 # Fast parser and aggregation tests
    integration/          # API endpoint and database integration tests
```

---

## 3. Design Principles
1. **Separation of Concerns**: API routes are lightweight controllers delegating to service classes; database queries are encapsulated in repositories.
2. **Deterministic Data Lineage**: All player statistics are calculated directly from raw event telemetry without fabricating fake metrics. Raw event payloads are preserved in PostgreSQL JSONB.
3. **Idempotency**: Data ingestion can be re-run at any time without duplicating matches, players, or events.
4. **Scouting Workflows**: Scouting observations and ratings are explicitly captured as first-class domain models separate from event metrics.
