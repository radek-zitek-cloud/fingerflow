"""Structured logging configuration using structlog."""
import logging
import sys
import structlog
from app.config import settings


def configure_logging():
    """
    Configure structlog for JSON-formatted structured logging.

    This setup ensures all logs (both from our app and from FastAPI/uvicorn)
    are output as structured JSON to stdout, suitable for centralized log aggregation.
    """
    # Configure standard library logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, settings.log_level.upper()),
    )

    # Configure structlog processors
    structlog.configure(
        processors=[
            # Add log level
            structlog.stdlib.add_log_level,
            # Add timestamp
            structlog.processors.TimeStamper(fmt="iso"),
            # Add caller information (file, line, function)
            structlog.processors.CallsiteParameterAdder(
                {
                    structlog.processors.CallsiteParameter.FILENAME,
                    structlog.processors.CallsiteParameter.LINENO,
                    structlog.processors.CallsiteParameter.FUNC_NAME,
                }
            ),
            # Stack info for exceptions
            structlog.processors.StackInfoRenderer(),
            # Format exceptions
            structlog.processors.format_exc_info,
            # Render as JSON
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str = __name__):
    """
    Get a structlog logger instance.

    Usage:
        logger = get_logger(__name__)
        logger.info("user_logged_in", user_id=123, email="user@example.com")
    """
    return structlog.get_logger(name)
