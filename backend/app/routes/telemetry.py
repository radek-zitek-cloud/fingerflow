"""Routes for telemetry event ingestion (PERFORMANCE CRITICAL)."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.models.typing_session import TypingSession
from app.models.telemetry_event import TelemetryEvent, EventType
from app.schemas.telemetry import TelemetryBatch
from app.utils.auth import get_current_user
from app.logging_config import get_logger

router = APIRouter()
logger = get_logger(__name__)


def validate_session_access(
    session_id: int,
    user_id: int,
    db: Session,
    operation: str = "access"
) -> TypingSession:
    """
    Validate that a session exists and belongs to the specified user.

    This is a critical security check that ensures users can only access
    their own typing sessions and telemetry data.

    Args:
        session_id: The ID of the session to validate
        user_id: The ID of the user requesting access
        db: Database session
        operation: Description of the operation for logging (e.g., "ingestion", "fetch")

    Returns:
        TypingSession: The validated session object

    Raises:
        HTTPException: 404 if session not found or doesn't belong to user
    """
    result = db.execute(
        select(TypingSession).where(
            TypingSession.id == session_id,
            TypingSession.user_id == user_id,
        )
    )
    session = result.scalar_one_or_none()

    if not session:
        logger.warning(
            f"session_{operation}_failed",
            session_id=session_id,
            user_id=user_id,
            reason="session_not_found",
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or access denied",
        )

    return session


@router.post("/sessions/{session_id}/telemetry", status_code=status.HTTP_200_OK)
async def ingest_telemetry(
    session_id: int,
    batch: TelemetryBatch,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Ingest a batch of telemetry events (PERFORMANCE CRITICAL ENDPOINT).

    This is the highest-frequency endpoint in the application. It receives
    batches of 20-50 keystroke events from the frontend.

    CRITICAL PERFORMANCE REQUIREMENTS:
    - MUST use bulk insert (never insert one by one)
    - MUST validate session ownership efficiently
    - MUST return 200 OK immediately after insert

    The frontend buffers events and sends them:
    - When buffer reaches 50 events, OR
    - Every 5 seconds, OR
    - On page unload (using navigator.sendBeacon)
    """
    # Validate that session exists and belongs to current user
    session = validate_session_access(session_id, current_user.id, db, "ingestion")

    # CRITICAL: Use bulk insert for performance
    # Converting Pydantic models to SQLAlchemy models in a single operation
    telemetry_events = [
        TelemetryEvent(
            session_id=session_id,
            event_type=event.event_type,
            key_code=event.key_code,
            timestamp_offset=event.timestamp_offset,
            finger_used=event.finger_used,
            is_error=event.is_error,
        )
        for event in batch.events
    ]

    # Bulk insert - this is MUCH faster than adding one by one
    db.add_all(telemetry_events)
    db.commit()

    logger.info(
        "telemetry_batch_ingested",
        session_id=session_id,
        user_id=current_user.id,
        event_count=len(batch.events),
    )

    return {
        "status": "ok",
        "ingested": len(batch.events),
        "session_id": session_id,
    }


@router.get("/sessions/{session_id}/telemetry")
async def get_session_telemetry(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = None,  # Optional limit for debugging, default returns all
):
    """
    Retrieve telemetry events for detailed session analysis.

    Returns only DOWN events (key presses) ordered by timestamp for:
    - Typing history reconstruction
    - WPM/accuracy evolution charts
    - Error pattern analysis

    Returns 50% less data than including both DOWN and UP events.

    Performance Notes:
    - Default behavior returns ALL events (required for complete analysis)
    - Typical session: 1-2 minutes = ~2,500 DOWN events
    - Safety limit: 20,000 events (prevents abuse from extremely long sessions)
    - Use 'limit' parameter for debugging or partial data retrieval
    """
    # Validate that session exists and belongs to current user
    session = validate_session_access(session_id, current_user.id, db, "telemetry_fetch")

    # Safety limit: Cap at 20,000 events to prevent abuse
    # (enough for ~8 minutes at 100 WPM)
    MAX_EVENTS = 20000
    effective_limit = min(limit, MAX_EVENTS) if limit else MAX_EVENTS

    # Fetch DOWN events only, ordered by timestamp
    query = (
        select(TelemetryEvent)
        .where(
            TelemetryEvent.session_id == session_id,
            TelemetryEvent.event_type == EventType.DOWN
        )
        .order_by(TelemetryEvent.timestamp_offset)
        .limit(effective_limit)
    )

    result = db.execute(query)
    events = result.scalars().all()

    logger.info(
        "telemetry_fetched",
        session_id=session_id,
        user_id=current_user.id,
        event_count=len(events),
        limit_applied=effective_limit,
    )

    return {
        "session_id": session_id,
        "events": [
            {
                "key_code": event.key_code,
                "timestamp_offset": event.timestamp_offset,
                "is_error": event.is_error,
            }
            for event in events
        ],
        "count": len(events),
        "truncated": len(events) >= effective_limit,
    }


@router.get("/sessions/{session_id}/telemetry/detailed")
async def get_detailed_telemetry(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = None,  # Optional limit for debugging, default returns all
):
    """
    Retrieve complete telemetry events (both DOWN and UP) for biomechanical analysis.

    Returns both DOWN and UP events with finger information for:
    - Dwell time calculation (time between DOWN and UP for each keystroke)
    - Flight time analysis (time between consecutive keystrokes)
    - Per-finger performance metrics
    - Per-key performance metrics

    This endpoint returns twice the data of the regular telemetry endpoint
    but is necessary for detailed biomechanical analysis.

    Performance Notes:
    - Default behavior returns ALL events (required for complete analysis)
    - Typical session: 1-2 minutes = ~5,000 events (DOWN + UP)
    - Safety limit: 40,000 events (prevents abuse from extremely long sessions)
    - Use 'limit' parameter for debugging or partial data retrieval
    - For complete dwell time analysis, both DOWN and UP events are required
    """
    # Validate that session exists and belongs to current user
    session = validate_session_access(session_id, current_user.id, db, "detailed_telemetry_fetch")

    # Safety limit: Cap at 40,000 events to prevent abuse
    # (enough for ~8 minutes at 100 WPM with DOWN+UP events)
    MAX_EVENTS = 40000
    effective_limit = min(limit, MAX_EVENTS) if limit else MAX_EVENTS

    # Fetch ALL events (both DOWN and UP), ordered by timestamp
    query = (
        select(TelemetryEvent)
        .where(TelemetryEvent.session_id == session_id)
        .order_by(TelemetryEvent.timestamp_offset)
        .limit(effective_limit)
    )

    result = db.execute(query)
    events = result.scalars().all()

    logger.info(
        "detailed_telemetry_fetched",
        session_id=session_id,
        user_id=current_user.id,
        event_count=len(events),
        limit_applied=effective_limit,
    )

    return {
        "session_id": session_id,
        "events": [
            {
                "event_type": event.event_type.value,
                "key_code": event.key_code,
                "timestamp_offset": event.timestamp_offset,
                "finger_used": event.finger_used.value,
                "is_error": event.is_error,
            }
            for event in events
        ],
        "count": len(events),
        "truncated": len(events) >= effective_limit,
    }
