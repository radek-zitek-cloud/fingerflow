"""Routes for managing typing sessions."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List

from app.database import get_db
from app.models.user import User
from app.models.typing_session import TypingSession
from app.schemas.telemetry import SessionCreate, SessionResponse
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
    end_time: int,
    wpm: float,
    accuracy: float,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Mark a session as completed and update final metrics.

    The frontend should call this when the user finishes typing.
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

    session.end_time = end_time
    session.wpm = wpm
    session.accuracy = accuracy

    db.commit()
    db.refresh(session)

    logger.info(
        "session_ended",
        session_id=session.id,
        user_id=current_user.id,
        wpm=wpm,
        accuracy=accuracy,
    )

    return session
