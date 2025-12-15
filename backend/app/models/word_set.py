"""WordSet model for storing collections of words for typing practice."""
from sqlalchemy import String, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base
from app.models._types import BIGINT_PK
from typing import List, Optional

class WordSet(Base):
    """
    WordSet model for storing named collections of words.

    Examples: "English 200", "Python Keywords", etc.
    The words are stored as a JSON array of strings.
    """

    __tablename__ = "word_sets"

    id: Mapped[int] = mapped_column(BIGINT_PK, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    words: Mapped[List[str]] = mapped_column(JSON, nullable=False)

    def __repr__(self) -> str:
        return f"<WordSet(id={self.id}, name={self.name}, word_count={len(self.words)})>"
