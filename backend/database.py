"""SQLAlchemy database engine, session factory, and dependency."""

import os
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# Database path — configurable via DATABASE_URL env var.
# On Render paid tier with a persistent disk, set DATABASE_URL=/data/zoom_clone.db
# On Render free tier (no disk), leave it unset — it defaults to ./zoom_clone.db
# which is writable but resets on each redeploy.
_db_path = os.getenv("DATABASE_URL", "./zoom_clone.db")

# Ensure the parent directory exists. If it doesn't and we can't create it
# (e.g. /data on Render free tier), fall back to the current directory.
_db_dir = os.path.dirname(os.path.abspath(_db_path))
try:
    os.makedirs(_db_dir, exist_ok=True)
except (PermissionError, OSError):
    # /data doesn't exist on Render free tier — fall back to local directory
    _db_path = "./zoom_clone.db"

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
