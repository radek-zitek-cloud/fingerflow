"""
Pytest Configuration and Fixtures

Provides common fixtures for testing including database setup,
test users, authentication tokens, etc.
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.models.user import User
from app.utils.auth import get_password_hash, create_access_token
from main import app


# Test database URL (in-memory SQLite)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture
async def test_engine():
    """Create test database engine."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    # Drop tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(test_engine):
    """Create test database session."""
    async_session = async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with async_session() as session:
        yield session


@pytest_asyncio.fixture
async def client(db_session):
    """Create test HTTP client."""

    # Override database dependency
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

    # Clean up
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_user(db_session) -> User:
    """Create a test user."""
    user = User(
        email="test@example.com",
        hashed_password=get_password_hash("testpass123"),
        auth_provider="local",
        created_at=1000000000000,
        email_verified=False,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def verified_user(db_session) -> User:
    """Create a test user with verified email."""
    user = User(
        email="verified@example.com",
        hashed_password=get_password_hash("testpass123"),
        auth_provider="local",
        created_at=1000000000000,
        email_verified=True,
        email_verified_at=1000000001000,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_user_with_2fa(db_session) -> User:
    """Create a test user with 2FA enabled."""
    from app.utils.two_factor import generate_2fa_secret, generate_backup_codes, hash_backup_codes

    secret = generate_2fa_secret()
    backup_codes = generate_backup_codes()

    user = User(
        email="2fa@example.com",
        hashed_password=get_password_hash("testpass123"),
        auth_provider="local",
        created_at=1000000000000,
        email_verified=True,
        email_verified_at=1000000001000,
        two_factor_enabled=True,
        two_factor_secret=secret,
        two_factor_backup_codes=hash_backup_codes(backup_codes),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    # Attach secret and backup codes for test access
    user.test_2fa_secret = secret
    user.test_backup_codes = backup_codes

    return user


@pytest_asyncio.fixture
def auth_token(test_user) -> str:
    """Create JWT token for test user."""
    return create_access_token(
        data={"user_id": test_user.id, "email": test_user.email}
    )


@pytest_asyncio.fixture
def auth_headers(auth_token) -> dict:
    """Create authorization headers with test token."""
    return {"Authorization": f"Bearer {auth_token}"}


@pytest_asyncio.fixture
def verified_auth_token(verified_user) -> str:
    """Create JWT token for verified user."""
    return create_access_token(
        data={"user_id": verified_user.id, "email": verified_user.email}
    )


@pytest_asyncio.fixture
def verified_auth_headers(verified_auth_token) -> dict:
    """Create authorization headers for verified user."""
    return {"Authorization": f"Bearer {verified_auth_token}"}


# Mock email service for testing
@pytest.fixture(autouse=True)
def mock_email_service(monkeypatch):
    """Mock email service to prevent actual emails during tests."""
    from app.services import email

    async def mock_send_verification_email(to_email, token):
        return True

    async def mock_send_password_reset_email(to_email, token):
        return True

    async def mock_send_2fa_backup_codes_email(to_email, codes):
        return True

    monkeypatch.setattr(
        email.email_service,
        "send_verification_email",
        mock_send_verification_email,
    )
    monkeypatch.setattr(
        email.email_service,
        "send_password_reset_email",
        mock_send_password_reset_email,
    )
    monkeypatch.setattr(
        email.email_service,
        "send_2fa_backup_codes_email",
        mock_send_2fa_backup_codes_email,
    )
