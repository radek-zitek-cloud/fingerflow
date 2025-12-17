"""Application configuration using pydantic-settings."""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    database_url: str = "postgresql://fingerflow:fingerflow_dev_password@localhost:5432/fingerflow"

    # JWT
    secret_key: str = "dev-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # Google OAuth2
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/auth/google/callback"

    # CORS
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    # Logging
    log_level: str = "INFO"

    # Email Configuration
    email_provider: str = "console"  # smtp, sendgrid, console
    email_from: str = "noreply@fingerflow.com"
    email_from_name: str = "FingerFlow"
    frontend_url: str = "http://localhost:5173"

    # SMTP Settings (if using SMTP provider)
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_use_tls: bool = True

    # Refresh Token
    refresh_token_expire_days: int = 7

    # Rate Limiting
    rate_limit_enabled: bool = True
    rate_limit_requests: int = 100
    rate_limit_window_seconds: int = 60

    # Security Settings
    csrf_protection_enabled: bool = True
    https_redirect_enabled: bool = False  # Enable in production
    security_headers_enabled: bool = True
    auth_rate_limit_enabled: bool = True

    # Account Lockout
    max_login_attempts: int = 5
    lockout_duration_minutes: int = 15
    lockout_reset_after_minutes: int = 60

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.cors_origins.split(",")]


settings = Settings()
