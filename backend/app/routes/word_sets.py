"""Routes for managing Word Sets."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List

from app.database import get_db
from app.models.word_set import WordSet
from app.schemas.word_set import WordSetCreate, WordSetUpdate, WordSetResponse
from app.utils.auth import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("/", response_model=List[WordSetResponse])
def list_word_sets(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    List all available word sets.
    """
    result = db.execute(select(WordSet).offset(skip).limit(limit))
    return result.scalars().all()

@router.get("/{set_id}", response_model=WordSetResponse)
def get_word_set(
    set_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific word set by ID.
    """
    result = db.execute(select(WordSet).where(WordSet.id == set_id))
    word_set = result.scalar_one_or_none()

    if not word_set:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Word set not found"
        )
    return word_set

@router.post("/", response_model=WordSetResponse, status_code=status.HTTP_201_CREATED)
def create_word_set(
    word_set: WordSetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new word set (Authenticated users only).
    """
    # Check if name exists
    result = db.execute(select(WordSet).where(WordSet.name == word_set.name))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Word set with this name already exists"
        )

    new_set = WordSet(
        name=word_set.name,
        description=word_set.description,
        words=word_set.words
    )

    db.add(new_set)
    db.commit()
    db.refresh(new_set)
    return new_set

@router.put("/{set_id}", response_model=WordSetResponse)
def update_word_set(
    set_id: int,
    word_set_update: WordSetUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update an existing word set (Authenticated users only).
    """
    result = db.execute(select(WordSet).where(WordSet.id == set_id))
    existing_set = result.scalar_one_or_none()

    if not existing_set:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Word set not found"
        )

    # Check name uniqueness if name is being changed
    if word_set_update.name != existing_set.name:
        name_check = db.execute(select(WordSet).where(WordSet.name == word_set_update.name))
        if name_check.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Word set with this name already exists"
            )

    existing_set.name = word_set_update.name
    existing_set.description = word_set_update.description
    existing_set.words = word_set_update.words

    db.commit()
    db.refresh(existing_set)
    return existing_set

@router.delete("/{set_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_word_set(
    set_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a word set (Authenticated users only).
    """
    result = db.execute(select(WordSet).where(WordSet.id == set_id))
    existing_set = result.scalar_one_or_none()

    if not existing_set:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Word set not found"
        )

    db.delete(existing_set)
    db.commit()
