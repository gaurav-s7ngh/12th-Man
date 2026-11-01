from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.health import router as health_router

app = FastAPI(
    title="12th Man API",
    description="Football Scouting and Recruitment Intelligence Platform",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    health_router,
    prefix="/api/v1",
    tags=["Health"],
)


@app.get("/")
def root():
    return {
        "message": "Welcome to 12th Man",
        "status": "running",
    }