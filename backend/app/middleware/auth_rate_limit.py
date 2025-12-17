"""
Authentication Rate Limiting

Stricter rate limits for authentication endpoints to prevent:
- Brute force attacks
- Credential stuffing
- Account enumeration
"""
import time
from collections import defaultdict
from typing import Dict, Tuple
from app.logging_config import get_logger

logger = get_logger(__name__)


class AuthRateLimitMiddleware:
    """
    Specialized rate limiting for authentication endpoints.

    Much stricter than general rate limiting:
    - Login: 5 attempts per 15 minutes
    - Register: 3 attempts per hour
    - Password reset: 3 attempts per hour
    - 2FA verification: 5 attempts per 15 minutes

    Uses IP-based tracking with exponential backoff on repeated failures.
    """

    def __init__(self, app):
        self.app = app

        # Track: {(ip, endpoint): [(timestamp, failed)]}
        self.attempts: Dict[Tuple[str, str], list] = defaultdict(list)

        # Lockout tracking: {(ip, endpoint): lockout_until_timestamp}
        self.lockouts: Dict[Tuple[str, str], float] = {}

        # Rate limits: {endpoint_pattern: (max_attempts, window_seconds)}
        self.rate_limits = {
            "/auth/login": (5, 900),  # 5 attempts per 15 minutes
            "/auth/register": (3, 3600),  # 3 attempts per hour
            "/auth/2fa-verify": (5, 900),  # 5 attempts per 15 minutes
            "/api/users/forgot-password": (3, 3600),  # 3 attempts per hour
            "/api/users/reset-password": (3, 3600),  # 3 attempts per hour
            "/api/users/change-password": (5, 1800),  # 5 attempts per 30 minutes
        }

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        path = scope.get("path", "")
        method = scope.get("method", "")

        # Only apply to auth endpoints
        if path not in self.rate_limits:
            return await self.app(scope, receive, send)

        # Get client IP
        client = scope.get("client")
        client_ip = client[0] if client else "unknown"

        # Check if currently locked out
        if self._is_locked_out(client_ip, path):
            lockout_until = self.lockouts[(client_ip, path)]
            remaining = int(lockout_until - time.time())

            logger.warning(
                "auth_rate_limit_lockout",
                ip=client_ip,
                path=path,
                method=method,
                remaining_seconds=remaining
            )

            body = (
                f'{{"detail":"Too many failed attempts. Account temporarily locked. '
                f'Try again in {remaining} seconds."}}'
            ).encode("utf-8")

            await send({
                "type": "http.response.start",
                "status": 429,
                "headers": [
                    (b"content-type", b"application/json"),
                    (b"retry-after", str(remaining).encode("ascii")),
                    (b"x-ratelimit-limit", b"0"),
                    (b"x-ratelimit-remaining", b"0"),
                ],
            })
            await send({
                "type": "http.response.body",
                "body": body,
                "more_body": False
            })
            return

        # Check rate limit
        if not self._is_allowed(client_ip, path):
            max_attempts, window = self.rate_limits[path]

            logger.warning(
                "auth_rate_limit_exceeded",
                ip=client_ip,
                path=path,
                method=method,
                limit=max_attempts,
                window=window
            )

            body = (
                f'{{"detail":"Too many requests. Limit: {max_attempts} per {window // 60} minutes"}}'
            ).encode("utf-8")

            await send({
                "type": "http.response.start",
                "status": 429,
                "headers": [
                    (b"content-type", b"application/json"),
                    (b"retry-after", str(window).encode("ascii")),
                ],
            })
            await send({
                "type": "http.response.body",
                "body": body,
                "more_body": False
            })
            return

        # Add rate limit headers
        remaining = self._get_remaining(client_ip, path)
        max_attempts, window = self.rate_limits[path]

        async def send_with_headers(message):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers.extend([
                    (b"x-ratelimit-limit", str(max_attempts).encode("ascii")),
                    (b"x-ratelimit-remaining", str(remaining).encode("ascii")),
                ])
                message["headers"] = headers
            await send(message)

        return await self.app(scope, receive, send_with_headers)

    def _is_allowed(self, ip: str, path: str) -> bool:
        """Check if request is allowed based on rate limit."""
        max_attempts, window_seconds = self.rate_limits.get(path, (100, 60))
        current_time = time.time()
        window_start = current_time - window_seconds

        key = (ip, path)

        # Clean old attempts
        self.attempts[key] = [
            (ts, failed) for ts, failed in self.attempts[key]
            if ts > window_start
        ]

        # Count attempts in current window
        total_attempts = len(self.attempts[key])

        if total_attempts >= max_attempts:
            # Check if multiple failures - trigger lockout
            failed_count = sum(1 for _, failed in self.attempts[key] if failed)
            if failed_count >= 3:  # 3 or more failures
                # Exponential backoff: base lockout increases with failures
                lockout_duration = min(900, 60 * (2 ** (failed_count - 3)))  # Max 15 min
                self.lockouts[key] = current_time + lockout_duration
                logger.warning(
                    "auth_lockout_triggered",
                    ip=ip,
                    path=path,
                    failed_attempts=failed_count,
                    lockout_seconds=lockout_duration
                )
            return False

        # Record attempt (we don't know if it failed yet, will be marked later)
        self.attempts[key].append((current_time, False))

        return True

    def _is_locked_out(self, ip: str, path: str) -> bool:
        """Check if IP is currently locked out for this endpoint."""
        key = (ip, path)
        if key not in self.lockouts:
            return False

        lockout_until = self.lockouts[key]
        if time.time() < lockout_until:
            return True

        # Lockout expired, remove it
        del self.lockouts[key]
        return False

    def _get_remaining(self, ip: str, path: str) -> int:
        """Get remaining requests for IP on this endpoint."""
        max_attempts, window_seconds = self.rate_limits.get(path, (100, 60))
        current_time = time.time()
        window_start = current_time - window_seconds

        key = (ip, path)

        # Count attempts in current window
        total_attempts = sum(
            1 for ts, _ in self.attempts[key]
            if ts > window_start
        )

        return max(0, max_attempts - total_attempts)

    def record_auth_failure(self, ip: str, path: str):
        """
        Record a failed authentication attempt.

        This should be called by auth routes when authentication fails
        to enable proper lockout triggering.

        Usage:
            auth_rate_limiter.record_auth_failure(request.client.host, "/auth/login")
        """
        key = (ip, path)
        current_time = time.time()

        # Find the most recent attempt and mark it as failed
        if key in self.attempts and self.attempts[key]:
            # Mark last attempt as failed
            last_attempt = self.attempts[key][-1]
            self.attempts[key][-1] = (last_attempt[0], True)

            # Count recent failures
            window_start = current_time - 900  # 15 minutes
            recent_failures = sum(
                1 for ts, failed in self.attempts[key]
                if ts > window_start and failed
            )

            # Trigger lockout if too many failures
            if recent_failures >= 3:
                lockout_duration = min(900, 60 * (2 ** (recent_failures - 3)))
                self.lockouts[key] = current_time + lockout_duration

                logger.warning(
                    "auth_lockout_triggered",
                    ip=ip,
                    path=path,
                    failed_attempts=recent_failures,
                    lockout_seconds=lockout_duration
                )


# Singleton instance
auth_rate_limiter = AuthRateLimitMiddleware(None)
