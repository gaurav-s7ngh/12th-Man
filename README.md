# 12th Man — Football Scouting & Recruitment Intelligence Platform

**12th Man** is a football scouting, performance analytics, and recruitment intelligence platform designed for scouts, analysts, and sporting directors. 

Operating on comprehensive event telemetry from the **StatsBomb 1. Bundesliga 2023/24** season, the platform bridges qualitative observational scouting with mathematical recruitment modeling: objective-driven candidate discovery, 2D recruitment matrix mapping (Profile Fit vs. Squad Complementarity), and unsupervised tactical archetype clustering.

---

## Architecture & Directory Structure

```
12th Man/
├── backend/                  # FastAPI REST service & database access layer
│   ├── app/
│   │   ├── api/routes/       # Endpoints: club, players, recruitment, ml, scouting, etc.
│   │   ├── core/             # Configuration, database engine, logging
│   │   ├── db/models/        # SQLAlchemy ORM declarative models
│   │   ├── ingestion/        # StatsBomb open data parser & pipeline
│   │   ├── repositories/     # Data access patterns (club, player, shortlist, etc.)
│   │   ├── schemas/          # Pydantic v2 validation models
│   │   └── services/         # Business logic (squad, recruitment, ml_service)
│   ├── scripts/              # Data utilities & telemetry enrichment scripts
│   └── tests/                # Pytest unit & integration test suites
├── database/                 # Database schema migrations & SQL dumps
├── docs/                     # Technical specifications, schema docs & guides
├── frontend/                 # React 19 + TypeScript + Vite SPA
│   ├── src/
│   │   ├── components/       # UI components (ClubSelector, TacticalPitch, badges, etc.)
│   │   ├── pages/            # Views: Overview, Squad, Tactics, Recruitment, Scouting, etc.
│   │   ├── services/         # Typed API client (api.ts)
│   │   └── types/            # TypeScript domain models
├── ml/                       # Machine Learning Subsystem (standalone)
│   ├── clustering/           # Tactical archetype discovery (PCA + K-Means)
│   ├── features/             # Per-90 telemetry feature matrix extraction
│   └── recruitment/          # Player cosine similarity engine
└── README.md
```

---

## Technical Stack

- **Backend**: Python 3.11+, FastAPI, SQLAlchemy 2.x, Alembic, Pydantic v2, Psycopg 3, Scikit-Learn, NumPy, Pandas
- **Database**: PostgreSQL 15+ (`twelve_man`)
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, TanStack Query v5, Recharts
- **ML Subsystem**: Standalone Scikit-Learn pipeline (PCA dimensionality reduction, K-Means clustering, Cosine similarity)
- **Active Dataset**: StatsBomb Open Data — 1. Bundesliga 2023/24 (Season ID: 281, Competition ID: 9)

---

## Getting Started

### 1. Prerequisites
- **Python**: 3.11 or higher
- **Node.js**: 20.x or higher with npm
- **PostgreSQL**: 15 or higher running locally on port `5432`

---

### 2. Database Setup

1. Create the PostgreSQL database:
   ```bash
   psql -U postgres -c "CREATE DATABASE twelve_man;"
   ```

2. If restoring from a previous database backup:
   ```bash
   pg_restore -U postgres -d twelve_man -v path/to/backup.dump
   ```

3. Alternatively, apply database migrations:
   ```bash
   cd backend
   alembic upgrade head
   ```

---

### 3. Backend Setup

```bash
cd backend

# 1. Create and activate a Python virtual environment
python -m venv venv
.\venv\Scripts\activate       # Windows PowerShell
# source venv/bin/activate    # Linux / macOS

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment variables
# Copy .env.example to .env and adjust database credentials if necessary:
cp .env.example .env

# 4. Optional: Populate preferred foot telemetry from match events
python scripts/populate_preferred_foot.py

# 5. Run the backend test suite
pytest -v

# 6. Start the FastAPI development server
uvicorn app.main:app --reload --port 8000
```

The API will be available at:
- **API Base**: `http://localhost:8000`
- **Swagger Documentation**: `http://localhost:8000/docs`
- **Service Health Probe**: `http://localhost:8000/api/v1/health`
- **Database Health Probe**: `http://localhost:8000/api/v1/db-health`

---

### 4. Frontend Setup

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Verify TypeScript build and ESLint
npm run build
npm run lint

# 3. Launch Vite development server
npm run dev
```

The application will be accessible in your browser at `http://localhost:5173`.

---

## Core Recruitment Workflow

1. **Club Switching (`TopNav -> ClubSelector`)**:
   Select any of the 18 Bundesliga clubs (e.g., Bayer 04 Leverkusen, FC Bayern München, Borussia Dortmund). Switching clubs updates the active tactical blueprint, squad roster, depth deficits, and recruitment need priorities across all pages without data crosstalk.

2. **Squad & Positional Depth (`/squad`)**:
   Inspect squad composition, age distribution, positional depth categories (Adequate, Thin, Critical Void, Surplus), and urgent recruitment voids derived from real match appearances.

3. **Tactical Constellation & Identity (`/tactics`)**:
   View the tactical constellation blueprint, pitch formation slots, and diagnosed tactical voids specific to the active club.

4. **Objective-Driven Recruitment (`/recruitment`)**:
   Define club recruitment needs or explore candidates for specific tactical profiles (e.g. *Box-to-Box Engine*, *Ball-Playing Defender*, *Inverted Creator*). Filter candidates by position group, preferred foot, playing time threshold, and minimum fit score.

5. **2D Recruitment Matrix (`/analytics-lab`)**:
   Evaluate every eligible Bundesliga candidate across two orthogonal dimensions:
   - **Profile Fit (X-Axis)**: Role-specific percentile score calculated from per-90 metrics.
   - **Squad Complementarity (Y-Axis)**: Calculated against the active club's positional depth voids and tactical system requirements.
   Filter by position group, preferred foot, sample confidence, or focus on specific matrix quadrants (*Priority Targets*, *Talented Specialists*, *Tactical Gap-Fillers*).

6. **Scouting Discovery (`/scouting`)**:
   Browse the full Bundesliga player database with multi-dimensional filtering (Position, Role, Preferred Foot, Minimum Minutes, Name Search) and toggle between Dossier Card view and sortable Tabular view.

7. **Player Dossier (`/players/:id`)**:
   Inspect comprehensive per-90 metrics, position-relative radar comparisons, match telemetry, tactical archetypes, ML similar players, and log observational scouting reports.

8. **Player Comparison (`/compare?playerA=...&playerB=...`)**:
   Direct head-to-head radar analysis comparing statistical metrics and recruitment fit profiles.

9. **Shortlists & Pipelines (`/shortlists`)**:
   Curate recruitment candidate pipelines, track targets, and preserve scouting notes across sessions.

---

## Dataset Scope & Characteristics

- **Primary Dataset**: StatsBomb Open Data for 1. Bundesliga 2023/24 (18 clubs, 462 active player records, 137,765 event records).
- **Match Coverage Note**: StatsBomb Open Data provides full match-level event coverage for Bayer 04 Leverkusen's unbeaten league campaign fixtures (34 matches), with complete lineup and appearance records for all 18 opposing Bundesliga clubs.
- **Birth Date Absence**: Birth dates are not provided in the StatsBomb Open Data specification; age filters are noted in the UI with a clear telemetry disclaimer.
- **Preferred Foot Derivation**: Preferred kicking foot is mathematically derived from match event telemetry (body part usage across passes and shots).

---

## Canonical Position Normalisation

To ensure reliable filtering and recruit evaluation, the platform employs a centralized 5-group canonical mapping across Backend, Frontend, and Machine Learning systems:

| Canonical Group | Abbr | Included StatsBomb Positions / Codes |
|---|---|---|
| **Goalkeeper** | `GK` | Goalkeeper |
| **Defender** | `DEF` | Center Back, Left Center Back, Right Center Back, Left Back, Right Back, Left Wing Back, Right Wing Back (`CB`, `LCB`, `RCB`, `LB`, `RB`, `LWB`, `RWB`) |
| **Midfielder** | `MID` | Defensive Midfield, Center Midfield, Attacking Midfield, Left Midfield, Right Midfield (`CDM`, `DM`, `CM`, `LCM`, `RCM`, `CAM`, `AM`, `LM`, `RM`) |
| **Winger** | `WNG` | Left Wing, Right Wing, Left Wing Forward, Right Wing Forward (`LW`, `RW`, `LWF`, `RWF`) |
| **Forward** | `FWD` | Center Forward, Left Center Forward, Right Center Forward, Secondary Striker, Striker (`ST`, `CF`, `SS`, `LF`, `RF`) |

- Wide midfielders (`LM`, `RM`) are classified under **Midfielder**.
- Wingers (`LW`, `RW`) are classified under **Winger** and are never conflated with center forwards.
- Wing-backs (`LWB`, `RWB`) remain in **Defender**.
- Substitute players with unrecorded tactical starting slots are labeled as `"Not recorded"` rather than fabricated.

---

## Automated Testing

```bash
# 1. Backend pytest suite (API integration, repository filters, ML pipelines)
cd backend
.\venv\Scripts\pytest.exe -v

# 2. End-to-end multi-club workflow test script
python scripts/e2e_verification.py

# 3. Full 8-stage product journey verification script
python scripts/test_full_journey.py

# 4. Frontend TypeScript check and production bundle build
cd frontend
npm run build

# 5. Frontend ESLint verification
npm run lint
```

---

## Troubleshooting

- **Port 8000 Conflict**: If the FastAPI server fails to start with `[Errno 10048] address already in use`, check for orphaned Python processes:
  ```powershell
  Get-NetTCPConnection -LocalPort 8000 | Select-Object OwningProcess
  Stop-Process -Id <PID> -Force
  ```
- **Database Connection Check**:
  Query the health endpoint to confirm PostgreSQL connectivity:
  ```bash
  curl http://localhost:8000/api/v1/db-health
  ```
  Expected response: `{"status":"ok","database":"connected"}`.
- **Frontend Cache**: If switching clubs does not immediately update, hard-refresh the browser (`Ctrl+F5`) to clear stale service worker or browser caches. TanStack Query automatically invalidates cache keys upon club selection.

---

## Attribution & Licensing

Football event telemetry is provided by **StatsBomb** under the [StatsBomb Open Data Licence](https://github.com/statsbomb/open-data).
Website: [https://statsbomb.com](https://statsbomb.com)
