from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.club import router as club_router
from app.api.routes.competitions import router as competitions_router
from app.api.routes.health import router as health_router
from app.api.routes.matches import router as matches_router
from app.api.routes.ml import router as ml_router
from app.api.routes.players import router as players_router
from app.api.routes.recruitment import router as recruitment_router
from app.api.routes.shortlists import router as shortlists_router
from app.api.routes.teams import router as teams_router

app = FastAPI(
    title="12th Man API",
    description="Football Scouting, Analytics and Recruitment Intelligence Platform",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API v1 routes
app.include_router(health_router, prefix="/api/v1", tags=["Health"])
app.include_router(club_router, prefix="/api/v1")
app.include_router(recruitment_router, prefix="/api/v1")
app.include_router(ml_router, prefix="/api/v1")
app.include_router(players_router, prefix="/api/v1", tags=["Players"])
app.include_router(teams_router, prefix="/api/v1", tags=["Teams"])
app.include_router(competitions_router, prefix="/api/v1")
app.include_router(matches_router, prefix="/api/v1", tags=["Matches"])
app.include_router(shortlists_router, prefix="/api/v1", tags=["Shortlists"])


@app.get("/")
def root():
    return {
        "message": "Welcome to 12th Man",
        "service": "12th Man Scouting & Recruitment Intelligence API",
        "status": "running",
        "version": "0.2.0",
        "docs": "/docs",
    }
