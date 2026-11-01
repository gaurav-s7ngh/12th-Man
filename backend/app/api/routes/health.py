from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.session import get_db

router = APIRouter()


@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "12th Man API"
    }


@router.get("/db-health")
def database_health(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))

        return {
            "status": "connected",
            "database": "twelve_man",
            "message": "PostgreSQL connection successful"
        }

    except SQLAlchemyError as exc:
        print(f"DATABASE ERROR: {exc!r}")

    raise HTTPException(
        status_code=503,
        detail="Database connection failed"
    )