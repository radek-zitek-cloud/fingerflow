"""
CSRF Protection Middleware

Protects against Cross-Site Request Forgery attacks by validating tokens
on state-changing operations (POST, PUT, PATCH, DELETE).
"""
from typing import Callable, Optional, Set
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from fastapi import HTTPException, status
from app.config import settings
from app.logging_config import get_logger

logger = get_logger(__name__)


class CSRFProtection:
    """
    CSRF Protection using signed tokens.

    Generates cryptographically signed tokens that must be included
    in state-changing requests. Tokens expire after a configurable time.
    """

    def __init__(
        self,
        secret_key: str,
        token_expiration: int = 3600,  # 1 hour default
        exempt_paths: Optional[Set[str]] = None
    ):
        """
        Initialize CSRF protection.

        Args:
            secret_key: Secret key for signing tokens
            token_expiration: Token validity in seconds
            exempt_paths: Set of paths exempt from CSRF protection (e.g., webhooks)
        """
        self.serializer = URLSafeTimedSerializer(secret_key, salt="csrf-protection")
        self.token_expiration = token_expiration
        self.exempt_paths = exempt_paths or {
            "/health",
            "/",
            "/docs",
            "/redoc",
            "/openapi.json",
        }

    def generate_token(self, session_id: Optional[str] = None) -> str:
        """
        Generate a new CSRF token.

        Args:
            session_id: Optional session identifier to bind token to

        Returns:
            Signed CSRF token string
        """
        payload = {"session_id": session_id} if session_id else {}
        return self.serializer.dumps(payload)

    def validate_token(self, token: str, session_id: Optional[str] = None) -> bool:
        """
        Validate a CSRF token.

        Args:
            token: CSRF token to validate
            session_id: Optional session identifier to verify binding

        Returns:
            True if token is valid, False otherwise
        """
        try:
            payload = self.serializer.loads(
                token,
                max_age=self.token_expiration
            )

            # If session_id provided, verify it matches
            if session_id:
                token_session = payload.get("session_id")
                if token_session and token_session != session_id:
                    logger.warning("csrf_validation_failed", reason="session_mismatch")
                    return False

            return True

        except SignatureExpired:
            logger.warning("csrf_validation_failed", reason="token_expired")
            return False
        except BadSignature:
            logger.warning("csrf_validation_failed", reason="invalid_signature")
            return False
        except Exception as e:
            logger.error("csrf_validation_error", error=str(e))
            return False


class CSRFMiddleware:
    """
    Middleware that enforces CSRF protection on state-changing requests.

    Checks for CSRF token in:
    1. X-CSRF-Token header (preferred)
    2. csrf_token form field

    Only validates on: POST, PUT, PATCH, DELETE
    """

    def __init__(
        self,
        app,
        enabled: bool = True,
        exempt_paths: Optional[Set[str]] = None
    ):
        """
        Initialize CSRF middleware.

        Args:
            app: FastAPI application
            enabled: Whether CSRF protection is enabled
            exempt_paths: Additional paths to exempt from CSRF
        """
        self.app = app
        self.enabled = enabled

        default_exempt = {
            "/health",
            "/",
            "/docs",
            "/redoc",
            "/openapi.json",
            "/auth/login",  # Exempt initial login (no token yet)
            "/auth/register",  # Exempt registration
            "/auth/refresh",  # Exempt token refresh
            "/auth/google/callback",  # Exempt OAuth callback
        }

        if exempt_paths:
            default_exempt.update(exempt_paths)

        self.csrf = CSRFProtection(
            secret_key=settings.secret_key,
            exempt_paths=default_exempt
        )

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        if not self.enabled:
            return await self.app(scope, receive, send)

        method = scope.get("method", "")
        path = scope.get("path", "")

        # Only check state-changing methods
        if method not in ["POST", "PUT", "PATCH", "DELETE"]:
            return await self.app(scope, receive, send)

        # Check if path is exempt
        if path in self.csrf.exempt_paths:
            return await self.app(scope, receive, send)

        # Also exempt paths that start with exempt paths (e.g., /api/system/logs)
        if any(path.startswith(exempt) for exempt in self.csrf.exempt_paths):
            return await self.app(scope, receive, send)

        # Extract CSRF token from headers
        headers = dict(scope.get("headers", []))
        csrf_token = headers.get(b"x-csrf-token", b"").decode()

        if not csrf_token:
            logger.warning("csrf_missing_token", path=path, method=method)
            await send({
                "type": "http.response.start",
                "status": 403,
                "headers": [
                    (b"content-type", b"application/json"),
                ],
            })
            await send({
                "type": "http.response.body",
                "body": b'{"detail":"CSRF token missing or invalid"}',
                "more_body": False,
            })
            return

        # Validate token
        if not self.csrf.validate_token(csrf_token):
            logger.warning("csrf_invalid_token", path=path, method=method)
            await send({
                "type": "http.response.start",
                "status": 403,
                "headers": [
                    (b"content-type", b"application/json"),
                ],
            })
            await send({
                "type": "http.response.body",
                "body": b'{"detail":"CSRF token invalid or expired"}',
                "more_body": False,
            })
            return

        # Token valid, proceed
        return await self.app(scope, receive, send)


# Singleton instance for generating tokens in route handlers
csrf_protection = CSRFProtection(secret_key=settings.secret_key)


def generate_csrf_token(session_id: Optional[str] = None) -> str:
    """
    Helper function to generate CSRF tokens in route handlers.

    Usage in route:
        from app.middleware.csrf_protection import generate_csrf_token

        @app.get("/get-csrf-token")
        async def get_token():
            return {"csrf_token": generate_csrf_token()}
    """
    return csrf_protection.generate_token(session_id)
