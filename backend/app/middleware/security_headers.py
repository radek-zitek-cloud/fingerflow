"""
Security Headers Middleware

Adds security-related HTTP headers to protect against common vulnerabilities:
- XSS attacks
- Clickjacking
- MIME type sniffing
- Information disclosure
"""
from typing import Callable
from app.logging_config import get_logger

logger = get_logger(__name__)


class SecurityHeadersMiddleware:
    """
    Middleware that adds security headers to all HTTP responses.

    Headers added:
    - X-Content-Type-Options: Prevents MIME type sniffing
    - X-Frame-Options: Prevents clickjacking
    - X-XSS-Protection: Enables browser XSS protection (legacy)
    - Strict-Transport-Security: Enforces HTTPS (HSTS)
    - Content-Security-Policy: Controls resource loading
    - Referrer-Policy: Controls referrer information
    - Permissions-Policy: Controls browser features
    """

    def __init__(self, app, hsts_max_age: int = 31536000):
        """
        Initialize security headers middleware.

        Args:
            app: FastAPI application
            hsts_max_age: HSTS max-age in seconds (default: 1 year)
        """
        self.app = app
        self.hsts_max_age = hsts_max_age

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        async def send_with_security_headers(message):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))

                # Prevent MIME type sniffing
                headers.append((b"x-content-type-options", b"nosniff"))

                # Prevent clickjacking
                headers.append((b"x-frame-options", b"DENY"))

                # Legacy XSS protection (still good to include for older browsers)
                headers.append((b"x-xss-protection", b"1; mode=block"))

                # HSTS: Force HTTPS for all future requests
                # includeSubDomains: Apply to all subdomains
                # preload: Allow inclusion in browser HSTS preload lists
                headers.append((
                    b"strict-transport-security",
                    f"max-age={self.hsts_max_age}; includeSubDomains; preload".encode()
                ))

                # Content Security Policy: Restrict resource loading
                # default-src 'self': Only load resources from same origin
                # script-src 'self' 'unsafe-inline': Allow inline scripts (needed for some SPAs)
                # style-src 'self' 'unsafe-inline': Allow inline styles
                # img-src 'self' data: https:: Allow images from self, data URLs, and HTTPS
                # font-src 'self' data:: Allow fonts from self and data URLs
                # connect-src 'self': Only allow API calls to same origin
                # frame-ancestors 'none': Prevent embedding in frames (same as X-Frame-Options)
                # base-uri 'self': Restrict base tag to same origin
                # form-action 'self': Restrict form submissions to same origin
                csp_policy = (
                    "default-src 'self'; "
                    "script-src 'self' 'unsafe-inline'; "
                    "style-src 'self' 'unsafe-inline'; "
                    "img-src 'self' data: https:; "
                    "font-src 'self' data:; "
                    "connect-src 'self'; "
                    "frame-ancestors 'none'; "
                    "base-uri 'self'; "
                    "form-action 'self'"
                )
                headers.append((b"content-security-policy", csp_policy.encode()))

                # Referrer Policy: Control referrer information leakage
                # no-referrer-when-downgrade: Send full URL in referrer unless HTTPS → HTTP
                headers.append((b"referrer-policy", b"no-referrer-when-downgrade"))

                # Permissions Policy: Control browser features
                # Disable potentially dangerous features by default
                permissions_policy = (
                    "geolocation=(), "
                    "microphone=(), "
                    "camera=(), "
                    "payment=(), "
                    "usb=(), "
                    "magnetometer=(), "
                    "gyroscope=(), "
                    "accelerometer=()"
                )
                headers.append((b"permissions-policy", permissions_policy.encode()))

                # Remove Server header to avoid information disclosure
                # Note: Some ASGI servers add this automatically, we remove if present
                headers = [(name, value) for name, value in headers if name.lower() != b"server"]

                message["headers"] = headers

            await send(message)

        return await self.app(scope, receive, send_with_security_headers)
