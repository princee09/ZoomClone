"""SQLAlchemy database engine, session factory, and dependency."""

import os
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# In production (Render), set DATABASE_URL=/data/zoom_clone.db
# The /data directory maps to a persistent disk so the DB survives redeploys.
# Locally this defaults to ./zoom_clone.db in the backend/ directory.
_db_path = os.getenv("DATABASE_URL", "./zoom_clone.db")

# Create the parent directory if it doesn't exist yet.
# This is critical on Render where /data is a mounted disk that may not
# have been provisioned before the first deploy runs.
_db_dir = os.path.dirname(os.path.abspath(_db_path))
os.makedirs(_db_dir, exist_ok=True)

DATABASE_URL = f"sqlite:///{_db_path}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # Required for SQLite
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""
    pass


def get_db() -> Generator:
    """FastAPI dependency that yields a database session and closes it after use."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
