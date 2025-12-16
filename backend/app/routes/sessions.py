"""Routes for managing typing sessions."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List

from app.database import get_db
from app.models.user import User
from app.models.typing_session import TypingSession
from app.schemas.telemetry import SessionCreate, SessionResponse, SessionEnd
from app.utils.auth import get_current_user
from app.logging_config import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    session_data: SessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a new typing session for the current user.

    The frontend should call this endpoint when the user starts typing.
    """
    new_session = TypingSession(
        user_id=current_user.id,
        start_time=session_data.start_time,
        end_time=None,
        wpm=None,
        accuracy=None,
    )

    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    logger.info(
        "session_created",
        session_id=new_session.id,
        user_id=current_user.id,
        start_time=new_session.start_time,
    )

    return new_session


@router.get("/range", response_model=List[SessionResponse])
async def get_sessions_by_date_range(
    start_date: int,
    end_date: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get all typing sessions for the current user within a date range.

    Args:
        start_date: Unix timestamp in milliseconds (inclusive)
        end_date: Unix timestamp in milliseconds (inclusive)

    Returns:
        List of sessions within the date range, ordered by start_time descending
    """
    # Validate date range
    if start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_date must be before or equal to end_date"
        )

    # Query sessions within the date range
    result = db.execute(
        select(TypingSession)
        .where(
            TypingSession.user_id == current_user.id,
            TypingSession.start_time >= start_date,
            TypingSession.start_time <= end_date,
            TypingSession.end_time.isnot(None)  # Only completed sessions
        )
        .order_by(TypingSession.start_time.desc())
    )
    sessions = result.scalars().all()

    logger.info(
        "sessions_fetched_by_range",
        user_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
        session_count=len(sessions),
    )

    return sessions


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get a specific typing session by ID.

    Users can only access their own sessions.
    """
    result = db.execute(
        select(TypingSession).where(
            TypingSession.id == session_id,
            TypingSession.user_id == current_user.id,
        )
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    return session


@router.get("", response_model=List[SessionResponse])
async def list_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 20,
    offset: int = 0,
):
    """
    List typing sessions for the current user.

    Supports pagination via limit and offset parameters.
    """
    result = db.execute(
        select(TypingSession)
        .where(TypingSession.user_id == current_user.id)
        .order_by(TypingSession.start_time.desc())
        .limit(limit)
        .offset(offset)
    )
    sessions = result.scalars().all()

    return sessions


@router.patch("/{session_id}/end", response_model=SessionResponse)
async def end_session(
    session_id: int,
    session_end: SessionEnd,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Mark a session as completed and update final metrics.

    The frontend should call this when the user finishes typing.
    Includes both productive WPM (correct chars only) and mechanical WPM (all keystrokes).
    """
    result = db.execute(
        select(TypingSession).where(
            TypingSession.id == session_id,
            TypingSession.user_id == current_user.id,
        )
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    # Update session with final metrics
    # Only update start_time if it wasn't set during session creation
    # (backward compatibility for old sessions)
    # Trust the database value as the single source of truth
    if session.start_time is None:
        session.start_time = session_end.start_time
    elif session.start_time != session_end.start_time:
        # Log warning if frontend sends different start_time
        logger.warning(
            "start_time_mismatch",
            session_id=session.id,
            user_id=current_user.id,
            db_start_time=session.start_time,
            frontend_start_time=session_end.start_time,
            delta_ms=abs(session.start_time - session_end.start_time),
        )

    session.end_time = session_end.end_time
    session.wpm = session_end.wpm
    session.mechanical_wpm = session_end.mechanical_wpm
    session.accuracy = session_end.accuracy
    session.total_characters = session_end.total_characters
    session.correct_characters = session_end.correct_characters
    session.incorrect_characters = session_end.incorrect_characters
    session.total_keystrokes = session_end.total_keystrokes
    session.practice_text = session_end.practice_text

    db.commit()
    db.refresh(session)

    logger.info(
        "session_ended",
        session_id=session.id,
        user_id=current_user.id,
        wpm=session_end.wpm,
        mechanical_wpm=session_end.mechanical_wpm,
        accuracy=session_end.accuracy,
        total_keystrokes=session_end.total_keystrokes,
    )

    return session


@router.delete("/{session_id}")
def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a typing session (abort session).

    This endpoint deletes a session and all associated telemetry data.
    Useful for aborting incomplete or invalid sessions.
    """
    # Get the session
    session = db.query(TypingSession).filter(
        TypingSession.id == session_id,
        TypingSession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    logger.info(
        "session_deleted",
        session_id=session.id,
        user_id=current_user.id,
    )

    # Delete the session (CASCADE will delete associated telemetry events)
    db.delete(session)
    db.commit()

    return {"message": "Session deleted successfully"}
