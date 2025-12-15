"""
Tests for Complete Authentication Routes

Tests email verification, refresh tokens, and 2FA flows.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.models.user import User
from app.models.token import EmailVerificationToken, RefreshToken


class TestRegistration:
    """Test user registration with email verification."""

    @pytest.mark.asyncio
    async def test_register_success(self, client: AsyncClient, db_session):
        """Test successful user registration."""
        response = await client.post(
            "/auth/register",
            json={"email": "test@example.com", "password": "TestPass123"},
        )

        assert response.status_code == 201
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

        # Verify user was created with email_verified=False
        result = await db_session.execute(
            select(User).where(User.email == "test@example.com")
        )
        user = result.scalar_one_or_none()
        assert user is not None
        assert user.email_verified is False

        # Verify email verification token was created
        result = await db_session.execute(
            select(EmailVerificationToken).where(
                EmailVerificationToken.user_id == user.id
            )
        )
        token = result.scalar_one_or_none()
        assert token is not None
        assert token.used is False

    @pytest.mark.asyncio
    async def test_register_duplicate_email(self, client: AsyncClient, test_user):
        """Test registration with duplicate email fails."""
        response = await client.post(
            "/auth/register",
            json={"email": test_user.email, "password": "TestPass123"},
        )

        assert response.status_code == 400
        assert "already registered" in response.json()["detail"].lower()


class TestEmailVerification:
    """Test email verification flow."""

    @pytest.mark.asyncio
    async def test_verify_email_success(self, client: AsyncClient, test_user, db_session):
        """Test successful email verification."""
        # Create verification token
        token = EmailVerificationToken(
            user_id=test_user.id,
            token=EmailVerificationToken.generate_token(),
            created_at=1000000000000,
            expires_at=9999999999000,  # Far future
        )
        db_session.add(token)
        await db_session.commit()

        # Verify email
        response = await client.post(
            "/auth/verify-email",
            json={"token": token.token},
        )

        assert response.status_code == 200
        assert response.json()["status"] == "success"

        # Check user is now verified
        await db_session.refresh(test_user)
        assert test_user.email_verified is True
        assert test_user.email_verified_at is not None

        # Check token is marked as used
        await db_session.refresh(token)
        assert token.used is True

    @pytest.mark.asyncio
    async def test_verify_email_invalid_token(self, client: AsyncClient):
        """Test email verification with invalid token."""
        response = await client.post(
            "/auth/verify-email",
            json={"token": "invalid_token"},
        )

        assert response.status_code == 400
        assert "invalid" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_verify_email_expired_token(self, client: AsyncClient, test_user, db_session):
        """Test email verification with expired token."""
        # Create expired token
        token = EmailVerificationToken(
            user_id=test_user.id,
            token=EmailVerificationToken.generate_token(),
            created_at=1000000000000,
            expires_at=1000000001000,  # Already expired
        )
        db_session.add(token)
        await db_session.commit()

        response = await client.post(
            "/auth/verify-email",
            json={"token": token.token},
        )

        assert response.status_code == 400
        assert "expired" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_resend_verification(self, client: AsyncClient, test_user, db_session):
        """Test resending verification email."""
        response = await client.post(
            "/auth/resend-verification",
            json={"email": test_user.email},
        )

        assert response.status_code == 200
        assert response.json()["status"] == "success"

        # Verify new token was created
        result = await db_session.execute(
            select(EmailVerificationToken).where(
                EmailVerificationToken.user_id == test_user.id,
                EmailVerificationToken.used == False,
            )
        )
        token = result.scalar_one_or_none()
        assert token is not None


class TestRefreshTokens:
    """Test refresh token flow."""

    @pytest.mark.asyncio
    async def test_refresh_token_success(self, client: AsyncClient, test_user, db_session):
        """Test successful token refresh."""
        # Create refresh token
        refresh_token = RefreshToken(
            user_id=test_user.id,
            token=RefreshToken.generate_token(),
            created_at=1000000000000,
            expires_at=9999999999000,  # Far future
            device_info="Test Device",
        )
        db_session.add(refresh_token)
        await db_session.commit()

        # Refresh tokens
        response = await client.post(
            "/auth/refresh",
            json={"refresh_token": refresh_token.token},
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

        # Verify old token is revoked
        await db_session.refresh(refresh_token)
        assert refresh_token.revoked is True

        # Verify new token was created
        result = await db_session.execute(
            select(RefreshToken).where(
                RefreshToken.user_id == test_user.id,
                RefreshToken.revoked == False,
            )
        )
        new_token = result.scalar_one_or_none()
        assert new_token is not None
        assert new_token.id != refresh_token.id

    @pytest.mark.asyncio
    async def test_refresh_token_invalid(self, client: AsyncClient):
        """Test refresh with invalid token."""
        response = await client.post(
            "/auth/refresh",
            json={"refresh_token": "invalid_token"},
        )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_revoke_token(self, client: AsyncClient, test_user, db_session):
        """Test revoking refresh token."""
        # Create refresh token
        refresh_token = RefreshToken(
            user_id=test_user.id,
            token=RefreshToken.generate_token(),
            created_at=1000000000000,
            expires_at=9999999999000,
            device_info="Test Device",
        )
        db_session.add(refresh_token)
        await db_session.commit()

        # Revoke token
        response = await client.post(
            "/auth/revoke",
            json={"refresh_token": refresh_token.token},
        )

        assert response.status_code == 200
        assert response.json()["status"] == "success"

        # Verify token is revoked
        await db_session.refresh(refresh_token)
        assert refresh_token.revoked is True

    @pytest.mark.asyncio
    async def test_list_sessions(self, client: AsyncClient, test_user, auth_headers, db_session):
        """Test listing active sessions."""
        # Create multiple refresh tokens
        for i in range(3):
            token = RefreshToken(
                user_id=test_user.id,
                token=f"token_{i}_{RefreshToken.generate_token()}",
                created_at=1000000000000 + (i * 1000),
                expires_at=9999999999000,
                device_info=f"Device {i}",
            )
            db_session.add(token)
        await db_session.commit()

        # List sessions
        response = await client.get("/auth/sessions", headers=auth_headers)

        assert response.status_code == 200
        sessions = response.json()
        assert len(sessions) == 3
        assert all("device_info" in s for s in sessions)
        assert all("created_at" in s for s in sessions)
        assert all("expires_at" in s for s in sessions)


class TestLogin:
    """Test login flow."""

    @pytest.mark.asyncio
    async def test_login_success(self, client: AsyncClient, test_user):
        """Test successful login."""
        response = await client.post(
            "/auth/login",
            json={"email": test_user.email, "password": "testpass123"},
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    @pytest.mark.asyncio
    async def test_login_invalid_password(self, client: AsyncClient, test_user):
        """Test login with wrong password."""
        response = await client.post(
            "/auth/login",
            json={"email": test_user.email, "password": "wrongpassword"},
        )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_login_nonexistent_user(self, client: AsyncClient):
        """Test login with non-existent email."""
        response = await client.post(
            "/auth/login",
            json={"email": "nonexistent@example.com", "password": "password"},
        )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_login_with_2fa_enabled(self, client: AsyncClient, test_user_with_2fa):
        """Test login when 2FA is enabled returns temp token."""
        response = await client.post(
            "/auth/login",
            json={"email": test_user_with_2fa.email, "password": "testpass123"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["requires_2fa"] is True
        assert "temp_token" in data
        assert "access_token" not in data  # Should not get access token yet
