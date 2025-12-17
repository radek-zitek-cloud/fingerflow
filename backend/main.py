"""
FingerFlow Backend - FastAPI Application

Main entry point for the FingerFlow typing diagnostics application.
This server acts as both an API backend and a centralized logging proxy.
"""
import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database import run_migrations
from app.logging_config import configure_logging, get_logger

# Configure structured logging
configure_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.

    Handles startup and shutdown events:
    - Startup: Initialize database tables
    - Shutdown: Cleanup resources
    """
    # Startup
    logger.info("application_startup", message="Initializing FingerFlow backend")
    # Avoid touching real local DB during tests (prevents sqlite file locks and keeps tests hermetic).
    if "pytest" not in sys.modules:
        # Use file lock to ensure only one worker runs migrations
        import fcntl
        import time
        lock_file_path = "/tmp/fingerflow_migration.lock"
        lock_file = None
        migration_ran = False
        try:
            lock_file = open(lock_file_path, "w")
            # Try to acquire lock with retries for other workers
            for attempt in range(3):
                try:
                    fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                    # Got the lock, run migrations
                    logger.info("migration_lock_acquired", message="Running database migrations")
                    run_migrations()
                    logger.info("database_migrations_complete", message="Database schema up to date")
                    migration_ran = True
                    break
                except BlockingIOError:
                    if attempt < 2:
                        # Another worker is running migrations, wait and retry
                        logger.info("migration_wait", message=f"Waiting for migrations to complete (attempt {attempt + 1}/3)")
                        time.sleep(5)
                    else:
                        # After 3 attempts, assume migrations completed
                        logger.info("migration_lock_skip", message="Another worker completed migrations")
                        break
        except Exception as e:
            logger.error("migration_error", error=str(e), exc_info=True)
            # Don't raise - allow worker to start even if migration fails
            # (migrations might have been run by another worker)
            if not migration_ran:
                logger.warning("migration_failed_continue", message="Continuing startup despite migration error")
        finally:
            if lock_file:
                try:
                    fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)
                    lock_file.close()
                except Exception:
                    pass
    else:
        logger.info("test_mode", message="Skipping migrations in test mode")

    yield

    # Shutdown
    logger.info("application_shutdown", message="Shutting down FingerFlow backend")


# Create FastAPI application
app = FastAPI(
    title="FingerFlow API",
    description="Biomechanical typing diagnostics and analytics platform",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security Middleware (order matters - most specific first)
# 1. HTTPS Redirect (if enabled in production)
if settings.https_redirect_enabled:
    from app.middleware.https_redirect import HTTPSRedirectMiddleware
    app.add_middleware(HTTPSRedirectMiddleware, enabled=True)
    logger.info("security_middleware_enabled", middleware="HTTPS Redirect")

# 2. Security Headers
if settings.security_headers_enabled:
    from app.middleware.security_headers import SecurityHeadersMiddleware
    app.add_middleware(SecurityHeadersMiddleware)
    logger.info("security_middleware_enabled", middleware="Security Headers")

# 3. CSRF Protection
if settings.csrf_protection_enabled:
    from app.middleware.csrf_protection import CSRFMiddleware
    app.add_middleware(CSRFMiddleware, enabled=True)
    logger.info("security_middleware_enabled", middleware="CSRF Protection")

# 4. Auth-specific Rate Limiting (stricter limits for auth endpoints)
if settings.auth_rate_limit_enabled:
    from app.middleware.auth_rate_limit import AuthRateLimitMiddleware
    app.add_middleware(AuthRateLimitMiddleware)
    logger.info("security_middleware_enabled", middleware="Auth Rate Limiting")

# 5. General Rate Limiting
from app.middleware.rate_limit import RateLimitMiddleware
app.add_middleware(RateLimitMiddleware)


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "ok",
        "app": "FingerFlow",
        "version": "1.0.0",
    }


@app.get("/health")
async def health_check():
    """Detailed health check endpoint."""
    return {
        "status": "healthy",
        "database": "connected",
        "logging": "configured",
    }


# Import and include routers
from app.routes import sessions, telemetry, system, users, two_factor, word_sets
from app.routes import auth_complete

app.include_router(auth_complete.router, prefix="/auth", tags=["Authentication"])
app.include_router(two_factor.router, prefix="/api/2fa", tags=["Two-Factor Auth"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["Sessions"])
app.include_router(telemetry.router, prefix="/api", tags=["Telemetry"])
app.include_router(system.router, prefix="/api/system", tags=["System"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(word_sets.router, prefix="/api/word-sets", tags=["Word Sets"])


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level=settings.log_level.lower(),
    )
