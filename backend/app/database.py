"""Database connection and session management (sync SQLAlchemy).

Why sync?
- The current environment/runtime has issues with aiosqlite's thread/queue model.
- Using the built-in sqlite3 driver via SQLAlchemy sync engine keeps local dev reliable.

FastAPI can safely use sync dependencies; endpoints may still be async, but DB I/O will
run in the threadpool when using sync route handlers, or will block the event loop if
used directly from async handlers.
"""

from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session

from app.config import settings


def _normalize_database_url(database_url: str) -> str:
    # Allow older async URLs in local config files.
    if database_url.startswith("sqlite+aiosqlite://"):
        return database_url.replace("sqlite+aiosqlite://", "sqlite://", 1)
    if database_url.startswith("postgresql+asyncpg://"):
        return database_url.replace("postgresql+asyncpg://", "postgresql://", 1)
    # Ensure psycopg2 is used for PostgreSQL (not psycopg3)
    if database_url.startswith("postgresql://") and "?" not in database_url:
        return database_url
    return database_url


def _get_connect_args(database_url: str) -> dict:
    """Get connection arguments based on database type."""
    if database_url.startswith("sqlite:"):
        return {"check_same_thread": False}
    # PostgreSQL connection pooling settings
    elif database_url.startswith("postgresql://"):
        return {
            "connect_timeout": 10,
        }
    return {}


database_url = _normalize_database_url(settings.database_url)

engine = create_engine(
    database_url,
    echo=settings.log_level == "DEBUG",
    future=True,
    connect_args=_get_connect_args(database_url),
    pool_pre_ping=True,  # Enable connection health checks
    pool_size=10,  # Connection pool size
    max_overflow=20,  # Max overflow connections
)

SessionLocal = sessionmaker(
    bind=engine,
    class_=Session,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)

Base = declarative_base()


def init_db() -> None:
    """Initialize database tables.

    Creates all tables defined in SQLAlchemy models if they don't exist.
    For PostgreSQL, this handles schema creation properly.
    For SQLite (legacy dev mode), ensures proper autoincrement.
    """
    # PostgreSQL handles schema creation cleanly
    if engine.dialect.name == "postgresql":
        Base.metadata.create_all(bind=engine)
        return

    # SQLite legacy support (for local development without Docker)
    if engine.dialect.name == "sqlite":
        with engine.connect() as conn:
            tables_to_check = [
                "users",
                "typing_sessions",
                "telemetry_events",
                "password_reset_tokens",
                "email_verification_tokens",
                "refresh_tokens",
                "word_sets",
            ]

            def table_exists(name: str) -> bool:
                res = conn.exec_driver_sql(
                    "SELECT 1 FROM sqlite_master WHERE type='table' AND name=? LIMIT 1",
                    (name,),
                ).fetchone()
                return res is not None

            def id_declared_as_bigint(table: str) -> bool:
                res = conn.exec_driver_sql(f"PRAGMA table_info({table})").fetchall()
                for row in res:
                    # row: (cid, name, type, notnull, dflt_value, pk)
                    if row[1] == "id":
                        declared = (row[2] or "").upper()
                        return declared.startswith("BIGINT")
                return False

            def table_rowcount(table: str) -> int:
                return int(
                    conn.exec_driver_sql(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
                )

            needs_recreate = any(
                table_exists(t) and id_declared_as_bigint(t) for t in tables_to_check
            )

            if needs_recreate:
                non_empty = [t for t in tables_to_check if table_exists(t) and table_rowcount(t) > 0]
                if non_empty:
                    raise RuntimeError(
                        "SQLite database schema uses BIGINT primary keys, which breaks autoincrement. "
                        f"Non-empty tables require a migration: {', '.join(non_empty)}"
                    )
                Base.metadata.drop_all(bind=engine)

    Base.metadata.create_all(bind=engine)


def run_migrations() -> None:
    """
    Run Alembic migrations to ensure database schema is up to date.

    This is called on application startup to automatically apply any pending migrations.
    Uses Alembic's programmatic API to run migrations.
    """
    from alembic.config import Config
    from alembic import command
    import os

    # Get the directory containing this file
    current_dir = os.path.dirname(os.path.abspath(__file__))
    # Go up one level to the backend directory
    backend_dir = os.path.dirname(current_dir)
    alembic_ini_path = os.path.join(backend_dir, "alembic.ini")

    # Create Alembic config
    alembic_cfg = Config(alembic_ini_path)

    # Run migrations
    command.upgrade(alembic_cfg, "head")


def get_db() -> Session:
    """
    FastAPI dependency for getting a database session.

    Note: This is intentionally synchronous. FastAPI will run sync dependencies
    in a thread pool, preventing blocking of the async event loop.
    """
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
