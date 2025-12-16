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
    result = db.execute(
        select(TypingSession).where(
            TypingSession.id == session_id,
            TypingSession.user_id == current_user.id,
        )
    )
    session = result.scalar_one_or_none()

    if not session:
        logger.warning(
            "telemetry_ingestion_failed",
            session_id=session_id,
            user_id=current_user.id,
            reason="session_not_found",
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or access denied",
        )

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
):
    """
    Retrieve telemetry events for detailed session analysis.

    Returns only DOWN events (key presses) ordered by timestamp for:
    - Typing history reconstruction
    - WPM/accuracy evolution charts
    - Error pattern analysis

    Returns 50% less data than including both DOWN and UP events.
    """
    # Validate that session exists and belongs to current user
    result = db.execute(
        select(TypingSession).where(
            TypingSession.id == session_id,
            TypingSession.user_id == current_user.id,
        )
    )
    session = result.scalar_one_or_none()

    if not session:
        logger.warning(
            "telemetry_fetch_failed",
            session_id=session_id,
            user_id=current_user.id,
            reason="session_not_found",
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or access denied",
        )

    # Fetch DOWN events only, ordered by timestamp
    result = db.execute(
        select(TelemetryEvent)
        .where(
            TelemetryEvent.session_id == session_id,
            TelemetryEvent.event_type == EventType.DOWN
        )
        .order_by(TelemetryEvent.timestamp_offset)
    )
    events = result.scalars().all()

    logger.info(
        "telemetry_fetched",
        session_id=session_id,
        user_id=current_user.id,
        event_count=len(events),
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
        ]
    }


@router.get("/sessions/{session_id}/telemetry/detailed")
async def get_detailed_telemetry(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
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
    """
    # Validate that session exists and belongs to current user
    result = db.execute(
        select(TypingSession).where(
            TypingSession.id == session_id,
            TypingSession.user_id == current_user.id,
        )
    )
    session = result.scalar_one_or_none()

    if not session:
        logger.warning(
            "detailed_telemetry_fetch_failed",
            session_id=session_id,
            user_id=current_user.id,
            reason="session_not_found",
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or access denied",
        )

    # Fetch ALL events (both DOWN and UP), ordered by timestamp
    result = db.execute(
        select(TelemetryEvent)
        .where(TelemetryEvent.session_id == session_id)
        .order_by(TelemetryEvent.timestamp_offset)
    )
    events = result.scalars().all()

    logger.info(
        "detailed_telemetry_fetched",
        session_id=session_id,
        user_id=current_user.id,
        event_count=len(events),
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
        ]
    }
