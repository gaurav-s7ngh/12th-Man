from app.api.routes.competitions import router as competitions_router
from app.api.routes.health import router as health_router
from app.api.routes.matches import router as matches_router
from app.api.routes.players import router as players_router
from app.api.routes.shortlists import router as shortlists_router
from app.api.routes.teams import router as teams_router

__all__ = [
    "health_router",
    "players_router",
    "teams_router",
    "matches_router",
    "competitions_router",
    "shortlists_router",
]
