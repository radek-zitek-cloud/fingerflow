"""
Tests for Two-Factor Authentication

Tests 2FA setup, verification, disable, and backup codes.
"""
import pytest
import pyotp
from httpx import AsyncClient

from app.models.user import User


class TestTwoFactorSetup:
    """Test 2FA setup flow."""

    @pytest.mark.asyncio
    async def test_setup_2fa_success(self, client: AsyncClient, verified_auth_headers, verified_user, db_session):
        """Test successful 2FA setup."""
        response = await client.post("/api/2fa/setup", headers=verified_auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert "secret" in data
        assert "qr_code" in data
        assert "backup_codes" in data
        assert len(data["backup_codes"]) == 10

        # Verify secret was stored but 2FA not enabled yet
        await db_session.refresh(verified_user)
        assert verified_user.two_factor_secret is not None
        assert verified_user.two_factor_enabled is False

    @pytest.mark.asyncio
    async def test_setup_2fa_already_enabled(
        self, client: AsyncClient, test_user_with_2fa, db_session
    ):
        """Test 2FA setup when already enabled fails."""
        from app.utils.auth import create_access_token

        token = create_access_token(
            data={"user_id": test_user_with_2fa.id, "email": test_user_with_2fa.email}
        )
        headers = {"Authorization": f"Bearer {token}"}

        response = await client.post("/api/2fa/setup", headers=headers)

        assert response.status_code == 400
        assert "already enabled" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_verify_setup_success(
        self, client: AsyncClient, verified_auth_headers, verified_user, db_session
    ):
        """Test successful 2FA verification and enablement."""
        # First setup 2FA
        setup_response = await client.post(
            "/api/2fa/setup", headers=verified_auth_headers
        )
        secret = setup_response.json()["secret"]

        # Generate valid TOTP code
        totp = pyotp.TOTP(secret)
        code = totp.now()

        # Verify and enable
        response = await client.post(
            "/api/2fa/verify-setup",
            headers=verified_auth_headers,
            json={"code": code},
        )

        assert response.status_code == 200
        assert response.json()["status"] == "success"

        # Verify 2FA is now enabled
        await db_session.refresh(verified_user)
        assert verified_user.two_factor_enabled is True

    @pytest.mark.asyncio
    async def test_verify_setup_invalid_code(
        self, client: AsyncClient, verified_auth_headers, db_session
    ):
        """Test 2FA verification with invalid code."""
        # First setup 2FA
        await client.post("/api/2fa/setup", headers=verified_auth_headers)

        # Try to verify with invalid code
        response = await client.post(
            "/api/2fa/verify-setup",
            headers=verified_auth_headers,
            json={"code": "000000"},
        )

        assert response.status_code == 401


class TestTwoFactorLogin:
    """Test 2FA during login."""

    @pytest.mark.asyncio
    async def test_2fa_login_flow(self, client: AsyncClient, test_user_with_2fa):
        """Test complete 2FA login flow."""
        # Step 1: Login with password
        login_response = await client.post(
            "/auth/login",
            json={"email": test_user_with_2fa.email, "password": "testpass123"},
        )

        assert login_response.status_code == 200
        data = login_response.json()
        assert data["requires_2fa"] is True
        assert "temp_token" in data

        # Step 2: Verify with 2FA code
        totp = pyotp.TOTP(test_user_with_2fa.test_2fa_secret)
        code = totp.now()

        verify_response = await client.post(
            "/auth/2fa-verify",
            json={"temp_token": data["temp_token"], "code": code},
        )

        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        assert "access_token" in verify_data
        assert "refresh_token" in verify_data

    @pytest.mark.asyncio
    async def test_2fa_login_with_backup_code(
        self, client: AsyncClient, test_user_with_2fa
    ):
        """Test 2FA login with backup code."""
        # Step 1: Login with password
        login_response = await client.post(
            "/auth/login",
            json={"email": test_user_with_2fa.email, "password": "testpass123"},
        )

        temp_token = login_response.json()["temp_token"]

        # Step 2: Verify with backup code
        backup_code = test_user_with_2fa.test_backup_codes[0]

        verify_response = await client.post(
            "/auth/2fa-verify",
            json={"temp_token": temp_token, "code": backup_code},
        )

        assert verify_response.status_code == 200
        assert "access_token" in verify_response.json()

    @pytest.mark.asyncio
    async def test_2fa_login_invalid_code(self, client: AsyncClient, test_user_with_2fa):
        """Test 2FA login with invalid code."""
        # Login with password
        login_response = await client.post(
            "/auth/login",
            json={"email": test_user_with_2fa.email, "password": "testpass123"},
        )

        temp_token = login_response.json()["temp_token"]

        # Try with invalid code
        verify_response = await client.post(
            "/auth/2fa-verify",
            json={"temp_token": temp_token, "code": "000000"},
        )

        assert verify_response.status_code == 401


class TestTwoFactorDisable:
    """Test 2FA disable flow."""

    @pytest.mark.asyncio
    async def test_disable_2fa_success(
        self, client: AsyncClient, test_user_with_2fa, db_session
    ):
        """Test successful 2FA disable."""
        from app.utils.auth import create_access_token

        token = create_access_token(
            data={"user_id": test_user_with_2fa.id, "email": test_user_with_2fa.email}
        )
        headers = {"Authorization": f"Bearer {token}"}

        # Generate valid code
        totp = pyotp.TOTP(test_user_with_2fa.test_2fa_secret)
        code = totp.now()

        # Disable 2FA
        response = await client.post(
            "/api/2fa/disable",
            headers=headers,
            json={"code": code, "password": "testpass123"},
        )

        assert response.status_code == 200
        assert response.json()["status"] == "success"

        # Verify 2FA is disabled
        await db_session.refresh(test_user_with_2fa)
        assert test_user_with_2fa.two_factor_enabled is False
        assert test_user_with_2fa.two_factor_secret is None

    @pytest.mark.asyncio
    async def test_disable_2fa_wrong_password(
        self, client: AsyncClient, test_user_with_2fa
    ):
        """Test 2FA disable with wrong password."""
        from app.utils.auth import create_access_token

        token = create_access_token(
            data={"user_id": test_user_with_2fa.id, "email": test_user_with_2fa.email}
        )
        headers = {"Authorization": f"Bearer {token}"}

        totp = pyotp.TOTP(test_user_with_2fa.test_2fa_secret)
        code = totp.now()

        response = await client.post(
            "/api/2fa/disable",
            headers=headers,
            json={"code": code, "password": "wrongpassword"},
        )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_disable_2fa_wrong_code(
        self, client: AsyncClient, test_user_with_2fa
    ):
        """Test 2FA disable with wrong code."""
        from app.utils.auth import create_access_token

        token = create_access_token(
            data={"user_id": test_user_with_2fa.id, "email": test_user_with_2fa.email}
        )
        headers = {"Authorization": f"Bearer {token}"}

        response = await client.post(
            "/api/2fa/disable",
            headers=headers,
            json={"code": "000000", "password": "testpass123"},
        )

        assert response.status_code == 401


class TestBackupCodes:
    """Test backup code management."""

    @pytest.mark.asyncio
    async def test_regenerate_backup_codes(
        self, client: AsyncClient, test_user_with_2fa, db_session
    ):
        """Test regenerating backup codes."""
        from app.utils.auth import create_access_token

        token = create_access_token(
            data={"user_id": test_user_with_2fa.id, "email": test_user_with_2fa.email}
        )
        headers = {"Authorization": f"Bearer {token}"}

        # Generate valid code
        totp = pyotp.TOTP(test_user_with_2fa.test_2fa_secret)
        code = totp.now()

        # Regenerate codes
        response = await client.post(
            "/api/2fa/regenerate-backup-codes",
            headers=headers,
            json={"code": code},
        )

        assert response.status_code == 200
        data = response.json()
        assert "backup_codes" in data
        assert len(data["backup_codes"]) == 10

        # Verify old codes are different from new ones
        new_codes = data["backup_codes"]
        old_codes = test_user_with_2fa.test_backup_codes
        assert set(new_codes) != set(old_codes)

    @pytest.mark.asyncio
    async def test_get_2fa_status_enabled(self, client: AsyncClient, test_user_with_2fa):
        """Test getting 2FA status when enabled."""
        from app.utils.auth import create_access_token

        token = create_access_token(
            data={"user_id": test_user_with_2fa.id, "email": test_user_with_2fa.email}
        )
        headers = {"Authorization": f"Bearer {token}"}

        response = await client.get("/api/2fa/status", headers=headers)

        assert response.status_code == 200
        data = response.json()
        assert data["enabled"] is True
        assert "backup_codes_remaining" in data

    @pytest.mark.asyncio
    async def test_get_2fa_status_disabled(
        self, client: AsyncClient, verified_user, verified_auth_headers
    ):
        """Test getting 2FA status when disabled."""
        response = await client.get("/api/2fa/status", headers=verified_auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["enabled"] is False
