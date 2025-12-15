"""
Rate Limiting Middleware

Implements sliding window rate limiting to prevent abuse.
"""
import time
from collections import defaultdict
from typing import Dict, Tuple
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings
from app.logging_config import get_logger

logger = get_logger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware using sliding window algorithm.

    Tracks requests per IP address and enforces configurable limits.
    """

    def __init__(self, app):
        super().__init__(app)
        # Store: {ip_address: [(timestamp, count)]}
        self.request_counts: Dict[str, list] = defaultdict(list)
        self.enabled = settings.rate_limit_enabled
        self.max_requests = settings.rate_limit_requests
        self.window_seconds = settings.rate_limit_window_seconds

    async def dispatch(self, request: Request, call_next):
        if not self.enabled:
            return await call_next(request)

        # Get client IP
        client_ip = request.client.host

        # Skip rate limiting for health checks
        if request.url.path in ["/health", "/"]:
            return await call_next(request)

        # Check rate limit
        if not self._is_allowed(client_ip):
            logger.warning(
                "rate_limit_exceeded",
                ip=client_ip,
                path=request.url.path,
                method=request.method
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many requests. Limit: {self.max_requests} per {self.window_seconds}s",
                headers={"Retry-After": str(self.window_seconds)}
            )

        # Process request
        response = await call_next(request)

        # Add rate limit headers
        remaining = self._get_remaining(client_ip)
        response.headers["X-RateLimit-Limit"] = str(self.max_requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(int(time.time()) + self.window_seconds)

        return response

    def _is_allowed(self, ip: str) -> bool:
        """Check if request is allowed based on rate limit."""
        current_time = time.time()
        window_start = current_time - self.window_seconds

        # Clean old requests
        self.request_counts[ip] = [
            (ts, count) for ts, count in self.request_counts[ip]
            if ts > window_start
        ]

        # Count requests in current window
        total_requests = sum(count for _, count in self.request_counts[ip])

        if total_requests >= self.max_requests:
            return False

        # Add current request
        self.request_counts[ip].append((current_time, 1))

        # Cleanup old IPs periodically (simple approach)
        if len(self.request_counts) > 10000:
            self._cleanup_old_ips(window_start)

        return True

    def _get_remaining(self, ip: str) -> int:
        """Get remaining requests for IP."""
        current_time = time.time()
        window_start = current_time - self.window_seconds

        # Count requests in current window
        total_requests = sum(
            count for ts, count in self.request_counts[ip]
            if ts > window_start
        )

        return max(0, self.max_requests - total_requests)

    def _cleanup_old_ips(self, window_start: float):
        """Remove IPs with no recent requests."""
        ips_to_remove = [
            ip for ip, requests in self.request_counts.items()
            if not any(ts > window_start for ts, _ in requests)
        ]

        for ip in ips_to_remove:
            del self.request_counts[ip]

        logger.info("rate_limit_cleanup", removed_ips=len(ips_to_remove))
