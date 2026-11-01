# 12th Man — Football Scouting & Recruitment Intelligence Platform

**12th Man** is a football scouting, performance analytics, and recruitment intelligence platform designed for scouts, analysts, and football managers.

---

## Technical Stack

- **Backend**: Python 3.13, FastAPI, SQLAlchemy 2.x, Alembic, Pydantic v2, Psycopg 3
- **Database**: PostgreSQL 18 (`twelve_man`)
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, React Router, TanStack Query, Recharts
- **Data Source**: StatsBomb Open Data (UEFA Euro 2024 dataset)

---

## Getting Started

### 1. Prerequisites
- Python 3.13+
- Node.js 20+ & npm
- PostgreSQL 18 running on `localhost:5432` with a database named `twelve_man`

---

### 2. Backend Setup

```bash
cd backend

# 1. Activate Python virtual environment
.\venv\Scripts\activate

# 2. Configure environment variables (copy and edit if needed)
cp .env.example .env

# 3. Apply Alembic database migrations
alembic upgrade head

# 4. Ingest StatsBomb Open Data (UEFA Euro 2024: 51 matches, 187k events)
python -m app.ingestion.statsbomb.cli --competition-id 55 --season-id 282

# 5. Run Backend Tests
pytest -v

# 6. Start the FastAPI Development Server
uvicorn app.main:app --reload --port 8000
```

The API will be accessible at:
- API Base: `http://localhost:8000`
- Interactive Swagger UI: `http://localhost:8000/docs`
- Health Probe: `http://localhost:8000/api/v1/health`
- Database Health Probe: `http://localhost:8000/api/v1/db-health`

---

### 3. Frontend Setup

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Type-check and lint
npm run build
npm run lint

# 3. Start Vite dev server
npm run dev
```

The application will be running at `http://localhost:5173`.

---

## Documentation

- Architecture: [`docs/architecture.md`](docs/architecture.md)
- Database Design: [`docs/database_schema.md`](docs/database_schema.md)
- Ingestion & Data Quality: [`docs/statsbomb_ingestion.md`](docs/statsbomb_ingestion.md)

---

## Data Attribution

Football event data is provided by **StatsBomb** under the [StatsBomb Open Data Licence](https://github.com/statsbomb/open-data).
Website: [https://statsbomb.com](https://statsbomb.com)
