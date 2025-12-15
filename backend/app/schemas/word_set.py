"""Pydantic schemas for WordSet operations."""
from pydantic import BaseModel, Field
from typing import List, Optional

class WordSetBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Unique name of the word set")
    description: Optional[str] = Field(None, max_length=255)
    words: List[str] = Field(..., min_items=1, description="List of words in the set")

class WordSetCreate(WordSetBase):
    pass

class WordSetUpdate(WordSetBase):
    pass

class WordSetResponse(WordSetBase):
    id: int

    class Config:
        from_attributes = True
