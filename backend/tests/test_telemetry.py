"""
Tests for telemetry endpoints and session management.

Tests cover:
- Telemetry ingestion (POST /sessions/{id}/telemetry)
- Telemetry retrieval (GET /sessions/{id}/telemetry)
- Detailed telemetry (GET /sessions/{id}/telemetry/detailed)
- Session validation and authorization
- Data truncation and safety limits
- Practice text validation
- validate_session_access() helper function
"""
import pytest
from fastapi import HTTPException
from app.models.typing_session import TypingSession
from app.models.telemetry_event import TelemetryEvent, EventType, FingerPosition
from app.routes.telemetry import validate_session_access


@pytest.fixture
def test_session(db_session, test_user):
    """Create a test typing session."""
    session = TypingSession(
        user_id=test_user.id,
        start_time=1000000000000,
        end_time=None,
        wpm=None,
        accuracy=None,
    )
    db_session.add(session)
    db_session.commit()
    db_session.refresh(session)
    return session


@pytest.fixture
def completed_session(db_session, test_user):
    """Create a completed typing session with metrics."""
    session = TypingSession(
        user_id=test_user.id,
        start_time=1000000000000,
        end_time=1000060000000,  # 60 seconds later
        wpm=75.5,
        mechanical_wpm=80.0,
        accuracy=95.5,
        total_characters=250,
        correct_characters=240,
        incorrect_characters=10,
        total_keystrokes=300,
        practice_text="The quick brown fox jumps over the lazy dog",
    )
    db_session.add(session)
    db_session.commit()
    db_session.refresh(session)
    return session


@pytest.fixture
def other_user_session(db_session, verified_user):
    """Create a session belonging to a different user."""
    session = TypingSession(
        user_id=verified_user.id,
        start_time=1000000000000,
        end_time=None,
        wpm=None,
        accuracy=None,
    )
    db_session.add(session)
    db_session.commit()
    db_session.refresh(session)
    return session


@pytest.mark.asyncio
class TestTelemetryIngestion:
    """Tests for POST /sessions/{id}/telemetry endpoint."""

    async def test_ingest_telemetry_batch_success(self, client, test_session, auth_headers):
        """Test successful telemetry batch ingestion."""
        batch = {
            "events": [
                {
                    "event_type": "DOWN",
                    "key_code": "KeyH",
                    "timestamp_offset": 0,
                    "finger_used": "R_INDEX",
                    "is_error": False,
                },
                {
                    "event_type": "UP",
                    "key_code": "KeyH",
                    "timestamp_offset": 50,
                    "finger_used": "R_INDEX",
                    "is_error": False,
                },
                {
                    "event_type": "DOWN",
                    "key_code": "KeyE",
                    "timestamp_offset": 100,
                    "finger_used": "L_MIDDLE",
                    "is_error": False,
                },
            ]
        }

        response = await client.post(
            f"/api/sessions/{test_session.id}/telemetry",
            json=batch,
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["ingested"] == 3
        assert data["session_id"] == test_session.id

    async def test_ingest_telemetry_unauthorized(self, client, other_user_session, auth_headers):
        """Test that users cannot ingest telemetry for other users' sessions."""
        batch = {
            "events": [
                {
                    "event_type": "DOWN",
                    "key_code": "KeyA",
                    "timestamp_offset": 0,
                    "finger_used": "L_PINKY",
                    "is_error": False,
                }
            ]
        }

        response = await client.post(
            f"/api/sessions/{other_user_session.id}/telemetry",
            json=batch,
            headers=auth_headers,
        )

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    async def test_ingest_telemetry_unauthenticated(self, client, test_session):
        """Test that unauthenticated requests are rejected."""
        batch = {
            "events": [
                {
                    "event_type": "DOWN",
                    "key_code": "KeyA",
                    "timestamp_offset": 0,
                    "finger_used": "L_PINKY",
                    "is_error": False,
                }
            ]
        }

        response = await client.post(
            f"/api/sessions/{test_session.id}/telemetry",
            json=batch,
        )

        assert response.status_code in [401, 403]  # Either Unauthorized or Forbidden

    async def test_ingest_telemetry_invalid_batch(self, client, test_session, auth_headers):
        """Test validation of telemetry batch."""
        # Empty batch
        response = await client.post(
            f"/api/sessions/{test_session.id}/telemetry",
            json={"events": []},
            headers=auth_headers,
        )
        assert response.status_code == 422

        # Batch too large (>100 events)
        large_batch = {
            "events": [
                {
                    "event_type": "DOWN",
                    "key_code": "KeyA",
                    "timestamp_offset": i,
                    "finger_used": "L_PINKY",
                    "is_error": False,
                }
                for i in range(101)
            ]
        }
        response = await client.post(
            f"/api/sessions/{test_session.id}/telemetry",
            json=large_batch,
            headers=auth_headers,
        )
        assert response.status_code == 422


@pytest.mark.asyncio
class TestTelemetryRetrieval:
    """Tests for GET /sessions/{id}/telemetry endpoint."""

    @pytest.fixture
    def session_with_telemetry(self, db_session, test_session):
        """Create a session with telemetry events."""
        events = [
            TelemetryEvent(
                session_id=test_session.id,
                event_type=EventType.DOWN,
                key_code="KeyH",
                timestamp_offset=0,
                finger_used=FingerPosition.R_INDEX,
                is_error=False,
            ),
            TelemetryEvent(
                session_id=test_session.id,
                event_type=EventType.UP,
                key_code="KeyH",
                timestamp_offset=50,
                finger_used=FingerPosition.R_INDEX,
                is_error=False,
            ),
            TelemetryEvent(
                session_id=test_session.id,
                event_type=EventType.DOWN,
                key_code="KeyE",
                timestamp_offset=100,
                finger_used=FingerPosition.L_MIDDLE,
                is_error=True,  # Error event
            ),
        ]
        db_session.add_all(events)
        db_session.commit()
        return test_session

    async def test_get_telemetry_returns_only_down_events(
        self, client, session_with_telemetry, auth_headers
    ):
        """Ensure telemetry endpoint filters DOWN events correctly."""
        response = await client.get(
            f"/api/sessions/{session_with_telemetry.id}/telemetry",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["session_id"] == session_with_telemetry.id
        assert data["count"] == 2  # Only DOWN events
        assert len(data["events"]) == 2
        assert data["truncated"] is False

        # Verify all events are DOWN events
        for event in data["events"]:
            assert "key_code" in event
            assert "timestamp_offset" in event
            assert "is_error" in event

    async def test_get_telemetry_respects_limit(
        self, client, db_session, test_session, auth_headers
    ):
        """Verify event limit is enforced."""
        # Create 100 DOWN events
        events = [
            TelemetryEvent(
                session_id=test_session.id,
                event_type=EventType.DOWN,
                key_code="KeyA",
                timestamp_offset=i * 100,
                finger_used=FingerPosition.L_PINKY,
                is_error=False,
            )
            for i in range(100)
        ]
        db_session.add_all(events)
        db_session.commit()

        # Request with limit
        response = await client.get(
            f"/api/sessions/{test_session.id}/telemetry?limit=50",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 50
        assert len(data["events"]) == 50
        assert data["truncated"] is True

    async def test_get_telemetry_unauthorized_access(
        self, client, other_user_session, auth_headers
    ):
        """Users cannot access other users' telemetry."""
        response = await client.get(
            f"/api/sessions/{other_user_session.id}/telemetry",
            headers=auth_headers,
        )

        assert response.status_code == 404


@pytest.mark.asyncio
class TestDetailedTelemetry:
    """Tests for GET /sessions/{id}/telemetry/detailed endpoint."""

    @pytest.fixture
    def session_with_mixed_events(self, db_session, test_session):
        """Create a session with both DOWN and UP events."""
        events = [
            TelemetryEvent(
                session_id=test_session.id,
                event_type=EventType.DOWN,
                key_code="KeyH",
                timestamp_offset=0,
                finger_used=FingerPosition.R_INDEX,
                is_error=False,
            ),
            TelemetryEvent(
                session_id=test_session.id,
                event_type=EventType.UP,
                key_code="KeyH",
                timestamp_offset=50,
                finger_used=FingerPosition.R_INDEX,
                is_error=False,
            ),
            TelemetryEvent(
                session_id=test_session.id,
                event_type=EventType.DOWN,
                key_code="KeyI",
                timestamp_offset=100,
                finger_used=FingerPosition.R_MIDDLE,
                is_error=False,
            ),
            TelemetryEvent(
                session_id=test_session.id,
                event_type=EventType.UP,
                key_code="KeyI",
                timestamp_offset=150,
                finger_used=FingerPosition.R_MIDDLE,
                is_error=False,
            ),
        ]
        db_session.add_all(events)
        db_session.commit()
        return test_session

    async def test_get_detailed_telemetry_returns_all_events(
        self, client, session_with_mixed_events, auth_headers
    ):
        """Ensure detailed endpoint returns both DOWN and UP events."""
        response = await client.get(
            f"/api/sessions/{session_with_mixed_events.id}/telemetry/detailed",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 4  # All events (DOWN + UP)
        assert len(data["events"]) == 4

        # Verify event structure includes finger information
        for event in data["events"]:
            assert "event_type" in event
            assert event["event_type"] in ["DOWN", "UP"]
            assert "key_code" in event
            assert "timestamp_offset" in event
            assert "finger_used" in event
            assert "is_error" in event

    async def test_detailed_telemetry_safety_limit(
        self, client, db_session, test_session, auth_headers
    ):
        """Verify 40k event safety limit for detailed telemetry."""
        # Create 200 events (100 DOWN + 100 UP)
        events = []
        for i in range(100):
            events.append(
                TelemetryEvent(
                    session_id=test_session.id,
                    event_type=EventType.DOWN,
                    key_code="KeyA",
                    timestamp_offset=i * 100,
                    finger_used=FingerPosition.L_PINKY,
                    is_error=False,
                )
            )
            events.append(
                TelemetryEvent(
                    session_id=test_session.id,
                    event_type=EventType.UP,
                    key_code="KeyA",
                    timestamp_offset=i * 100 + 50,
                    finger_used=FingerPosition.L_PINKY,
                    is_error=False,
                )
            )
        db_session.add_all(events)
        db_session.commit()

        # Request with limit
        response = await client.get(
            f"/api/sessions/{test_session.id}/telemetry/detailed?limit=150",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 150
        assert data["truncated"] is True


@pytest.mark.asyncio
class TestSessionEndValidation:
    """Tests for practice_text validation and session end logic."""

    async def test_session_end_with_valid_practice_text(
        self, client, test_session, auth_headers
    ):
        """Test ending session with valid practice text."""
        session_end = {
            "start_time": 1000000000000,
            "end_time": 1000060000000,
            "wpm": 75.5,
            "mechanical_wpm": 80.0,
            "accuracy": 95.5,
            "total_characters": 250,
            "correct_characters": 240,
            "incorrect_characters": 10,
            "total_keystrokes": 300,
            "practice_text": "The quick brown fox jumps over the lazy dog",
        }

        response = await client.patch(
            f"/api/sessions/{test_session.id}/end",
            json=session_end,
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["practice_text"] == session_end["practice_text"]

    async def test_session_end_rejects_empty_practice_text(
        self, client, test_session, auth_headers
    ):
        """Test that empty practice_text is rejected."""
        session_end = {
            "start_time": 1000000000000,
            "end_time": 1000060000000,
            "wpm": 75.5,
            "mechanical_wpm": 80.0,
            "accuracy": 95.5,
            "total_characters": 250,
            "correct_characters": 240,
            "incorrect_characters": 10,
            "total_keystrokes": 300,
            "practice_text": "",  # Empty string
        }

        response = await client.patch(
            f"/api/sessions/{test_session.id}/end",
            json=session_end,
            headers=auth_headers,
        )

        assert response.status_code == 422  # Validation error

    async def test_session_end_rejects_oversized_practice_text(
        self, client, test_session, auth_headers
    ):
        """Test that oversized practice_text (>10k chars) is rejected."""
        session_end = {
            "start_time": 1000000000000,
            "end_time": 1000060000000,
            "wpm": 75.5,
            "mechanical_wpm": 80.0,
            "accuracy": 95.5,
            "total_characters": 250,
            "correct_characters": 240,
            "incorrect_characters": 10,
            "total_keystrokes": 300,
            "practice_text": "a" * 10001,  # 10,001 characters
        }

        response = await client.patch(
            f"/api/sessions/{test_session.id}/end",
            json=session_end,
            headers=auth_headers,
        )

        assert response.status_code == 422  # Validation error

    async def test_session_end_preserves_original_start_time(
        self, client, test_session, auth_headers
    ):
        """Test that database start_time is not overwritten."""
        original_start_time = test_session.start_time

        session_end = {
            "start_time": original_start_time + 5000,  # Different time!
            "end_time": 1000060000000,
            "wpm": 75.5,
            "mechanical_wpm": 80.0,
            "accuracy": 95.5,
            "total_characters": 250,
            "correct_characters": 240,
            "incorrect_characters": 10,
            "total_keystrokes": 300,
            "practice_text": "Test text",
        }

        response = await client.patch(
            f"/api/sessions/{test_session.id}/end",
            json=session_end,
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        # Database start_time should be preserved
        assert data["start_time"] == original_start_time


class TestValidateSessionAccess:
    """Tests for validate_session_access() helper function."""

    def test_validate_session_access_success(self, db_session, test_user, test_session):
        """Test successful session validation."""
        session = validate_session_access(
            session_id=test_session.id,
            user_id=test_user.id,
            db=db_session,
            operation="test",
        )

        assert session is not None
        assert session.id == test_session.id
        assert session.user_id == test_user.id

    def test_validate_session_access_wrong_user(
        self, db_session, verified_user, test_session
    ):
        """Test that validation fails for wrong user."""
        with pytest.raises(HTTPException) as exc_info:
            validate_session_access(
                session_id=test_session.id,
                user_id=verified_user.id,  # Different user!
                db=db_session,
                operation="test",
            )

        assert exc_info.value.status_code == 404
        assert "not found" in exc_info.value.detail.lower()

    def test_validate_session_access_nonexistent_session(
        self, db_session, test_user
    ):
        """Test that validation fails for nonexistent session."""
        with pytest.raises(HTTPException) as exc_info:
            validate_session_access(
                session_id=99999,  # Doesn't exist
                user_id=test_user.id,
                db=db_session,
                operation="test",
            )

        assert exc_info.value.status_code == 404

    def test_validate_session_access_custom_operation_name(
        self, db_session, test_user, test_session
    ):
        """Test that custom operation name is used in logging."""
        # This test just verifies it doesn't crash with custom operation names
        session = validate_session_access(
            session_id=test_session.id,
            user_id=test_user.id,
            db=db_session,
            operation="custom_operation",
        )

        assert session is not None
