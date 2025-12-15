"""
Tests for Password Reset Functionality

Tests the forgot password and reset password flows.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.models.user import User
from app.models.token import PasswordResetToken
from app.utils.auth import verify_password


class TestForgotPassword:
    """Test password reset request flow."""

    @pytest.mark.asyncio
    async def test_forgot_password_success(self, client: AsyncClient, test_user, db_session):
        """Test successful password reset request."""
        response = await client.post(
            "/api/users/forgot-password",
            json={"email": test_user.email},
        )

        assert response.status_code == 200
        assert response.json()["status"] == "success"

        # Verify token was created
        result = await db_session.execute(
            select(PasswordResetToken).where(
                PasswordResetToken.user_id == test_user.id
            )
        )
        token = result.scalar_one_or_none()
        assert token is not None
        assert token.used is False
        assert not token.is_expired()

    @pytest.mark.asyncio
    async def test_forgot_password_nonexistent_user(self, client: AsyncClient):
        """Test password reset for non-existent user returns success (anti-enumeration)."""
        response = await client.post(
            "/api/users/forgot-password",
            json={"email": "nonexistent@example.com"},
        )

        # Should still return success to prevent email enumeration
        assert response.status_code == 200
        assert response.json()["status"] == "success"

    @pytest.mark.asyncio
    async def test_forgot_password_oauth_user(self, client: AsyncClient, db_session):
        """Test password reset for OAuth user returns success but doesn't send email."""
        # Create OAuth user
        oauth_user = User(
            email="oauth@example.com",
            auth_provider="google",
            created_at=1000000000000,
        )
        db_session.add(oauth_user)
        await db_session.commit()

        response = await client.post(
            "/api/users/forgot-password",
            json={"email": oauth_user.email},
        )

        # Should return success (anti-enumeration)
        assert response.status_code == 200

        # But no token should be created
        result = await db_session.execute(
            select(PasswordResetToken).where(
                PasswordResetToken.user_id == oauth_user.id
            )
        )
        token = result.scalar_one_or_none()
        assert token is None

    @pytest.mark.asyncio
    async def test_forgot_password_invalidates_old_tokens(
        self, client: AsyncClient, test_user, db_session
    ):
        """Test that requesting password reset invalidates previous tokens."""
        # Create first token
        await client.post(
            "/api/users/forgot-password",
            json={"email": test_user.email},
        )

        result = await db_session.execute(
            select(PasswordResetToken).where(
                PasswordResetToken.user_id == test_user.id
            )
        )
        first_token = result.scalar_one()

        # Request another reset
        await client.post(
            "/api/users/forgot-password",
            json={"email": test_user.email},
        )

        # First token should no longer exist (deleted)
        result = await db_session.execute(
            select(PasswordResetToken).where(
                PasswordResetToken.id == first_token.id
            )
        )
        assert result.scalar_one_or_none() is None


class TestResetPassword:
    """Test password reset completion flow."""

    @pytest.mark.asyncio
    async def test_reset_password_success(self, client: AsyncClient, test_user, db_session):
        """Test successful password reset."""
        # Create reset token
        token = PasswordResetToken(
            user_id=test_user.id,
            token=PasswordResetToken.generate_token(),
            created_at=1000000000000,
            expires_at=9999999999000,  # Far future
        )
        db_session.add(token)
        await db_session.commit()

        new_password = "NewTestPass456"

        # Reset password
        response = await client.post(
            "/api/users/reset-password",
            json={"token": token.token, "new_password": new_password},
        )

        assert response.status_code == 200
        assert response.json()["status"] == "success"

        # Verify password was changed
        await db_session.refresh(test_user)
        assert verify_password(new_password, test_user.hashed_password)

        # Verify token is marked as used
        await db_session.refresh(token)
        assert token.used is True

    @pytest.mark.asyncio
    async def test_reset_password_invalid_token(self, client: AsyncClient):
        """Test password reset with invalid token."""
        response = await client.post(
            "/api/users/reset-password",
            json={"token": "invalid_token", "new_password": "NewPass123"},
        )

        assert response.status_code == 400
        assert "invalid" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_reset_password_expired_token(self, client: AsyncClient, test_user, db_session):
        """Test password reset with expired token."""
        # Create expired token
        token = PasswordResetToken(
            user_id=test_user.id,
            token=PasswordResetToken.generate_token(),
            created_at=1000000000000,
            expires_at=1000000001000,  # Already expired
        )
        db_session.add(token)
        await db_session.commit()

        response = await client.post(
            "/api/users/reset-password",
            json={"token": token.token, "new_password": "NewPass123"},
        )

        assert response.status_code == 400
        assert "expired" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_reset_password_used_token(self, client: AsyncClient, test_user, db_session):
        """Test password reset with already used token."""
        # Create used token
        token = PasswordResetToken(
            user_id=test_user.id,
            token=PasswordResetToken.generate_token(),
            created_at=1000000000000,
            expires_at=9999999999000,
            used=True,  # Already used
        )
        db_session.add(token)
        await db_session.commit()

        response = await client.post(
            "/api/users/reset-password",
            json={"token": token.token, "new_password": "NewPass123"},
        )

        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_reset_password_oauth_user(self, client: AsyncClient, db_session):
        """Test password reset for OAuth user fails."""
        # Create OAuth user
        oauth_user = User(
            email="oauth@example.com",
            auth_provider="google",
            created_at=1000000000000,
        )
        db_session.add(oauth_user)
        await db_session.commit()

        # Create reset token
        token = PasswordResetToken(
            user_id=oauth_user.id,
            token=PasswordResetToken.generate_token(),
            created_at=1000000000000,
            expires_at=9999999999000,
        )
        db_session.add(token)
        await db_session.commit()

        response = await client.post(
            "/api/users/reset-password",
            json={"token": token.token, "new_password": "NewPass123"},
        )

        assert response.status_code == 400
        assert "oauth" in response.json()["detail"].lower()


class TestPasswordChange:
    """Test password change for logged-in users."""

    @pytest.mark.asyncio
    async def test_change_password_success(
        self, client: AsyncClient, test_user, auth_headers, db_session
    ):
        """Test successful password change."""
        new_password = "NewTestPass789"

        response = await client.post(
            "/api/users/change-password",
            headers=auth_headers,
            json={
                "current_password": "testpass123",
                "new_password": new_password,
            },
        )

        assert response.status_code == 200
        assert response.json()["status"] == "success"

        # Verify password was changed
        await db_session.refresh(test_user)
        assert verify_password(new_password, test_user.hashed_password)

    @pytest.mark.asyncio
    async def test_change_password_wrong_current_password(
        self, client: AsyncClient, auth_headers
    ):
        """Test password change with wrong current password."""
        response = await client.post(
            "/api/users/change-password",
            headers=auth_headers,
            json={
                "current_password": "wrongpassword",
                "new_password": "NewPass123",
            },
        )

        assert response.status_code == 401
        assert "incorrect" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_change_password_oauth_user(self, client: AsyncClient, db_session):
        """Test password change for OAuth user fails."""
        # Create OAuth user and token
        from app.utils.auth import create_access_token

        oauth_user = User(
            email="oauth@example.com",
            auth_provider="google",
            created_at=1000000000000,
        )
        db_session.add(oauth_user)
        await db_session.commit()
        await db_session.refresh(oauth_user)

        oauth_token = create_access_token(
            data={"user_id": oauth_user.id, "email": oauth_user.email}
        )

        response = await client.post(
            "/api/users/change-password",
            headers={"Authorization": f"Bearer {oauth_token}"},
            json={
                "current_password": "anything",
                "new_password": "NewPass123",
            },
        )

        assert response.status_code == 400
        assert "oauth" in response.json()["detail"].lower()
