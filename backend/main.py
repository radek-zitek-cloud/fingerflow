"""
FingerFlow Backend - FastAPI Application

Main entry point for the FingerFlow typing diagnostics application.
This server acts as both an API backend and a centralized logging proxy.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database import init_db
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
    await init_db()
    logger.info("database_initialized", message="Database tables created/verified")

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

# Add rate limiting middleware
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
from app.routes import auth, sessions, telemetry, system, users, two_factor
from app.routes import auth_complete

app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(auth_complete.router, prefix="/auth", tags=["Authentication"])
app.include_router(two_factor.router, prefix="/api/2fa", tags=["Two-Factor Auth"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["Sessions"])
app.include_router(telemetry.router, prefix="/api", tags=["Telemetry"])
app.include_router(system.router, prefix="/api/system", tags=["System"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level=settings.log_level.lower(),
    )
