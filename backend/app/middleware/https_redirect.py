"""
HTTPS Redirect Middleware

Redirects all HTTP requests to HTTPS in production environments.
Can be disabled for local development.
"""
from typing import Callable
from app.logging_config import get_logger

logger = get_logger(__name__)


class HTTPSRedirectMiddleware:
    """
    Middleware that redirects HTTP requests to HTTPS.

    In production, all traffic should be encrypted. This middleware
    ensures that any HTTP requests are automatically redirected to HTTPS.

    Can be disabled via configuration for local development.
    """

    def __init__(self, app, enabled: bool = True):
        """
        Initialize HTTPS redirect middleware.

        Args:
            app: FastAPI application
            enabled: Whether to enforce HTTPS redirects
        """
        self.app = app
        self.enabled = enabled

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        if not self.enabled:
            return await self.app(scope, receive, send)

        # Check if request is already HTTPS
        scheme = scope.get("scheme", "http")
        headers = dict(scope.get("headers", []))

        # Check X-Forwarded-Proto header (set by reverse proxies/load balancers)
        forwarded_proto = headers.get(b"x-forwarded-proto", b"").decode()

        if scheme == "https" or forwarded_proto == "https":
            # Already HTTPS, proceed normally
            return await self.app(scope, receive, send)

        # Redirect to HTTPS
        host = headers.get(b"host", b"").decode()
        path = scope.get("path", "/")
        query_string = scope.get("query_string", b"").decode()

        if query_string:
            redirect_url = f"https://{host}{path}?{query_string}"
        else:
            redirect_url = f"https://{host}{path}"

        logger.info(
            "https_redirect",
            from_url=f"{scheme}://{host}{path}",
            to_url=redirect_url,
            client=scope.get("client", ["unknown"])[0]
        )

        # Send 301 Permanent Redirect
        await send({
            "type": "http.response.start",
            "status": 301,
            "headers": [
                (b"location", redirect_url.encode()),
                (b"content-type", b"text/plain"),
            ],
        })
        await send({
            "type": "http.response.body",
            "body": b"Redirecting to HTTPS",
            "more_body": False,
        })
