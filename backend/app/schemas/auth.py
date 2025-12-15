"""Authentication-related Pydantic schemas."""
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
import re


class UserCreate(BaseModel):
    """Schema for user registration."""

    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128, description="Password must be at least 8 characters")

    @field_validator('password')
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """
        Validate password meets security requirements.

        Requirements:
        - At least 8 characters (enforced by Field min_length)
        - At least one uppercase letter
        - At least one lowercase letter
        - At least one number
        """
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'[0-9]', v):
            raise ValueError('Password must contain at least one number')
        return v


class UserLogin(BaseModel):
    """Schema for user login."""

    email: EmailStr
    password: str


class Token(BaseModel):
    """Schema for JWT token response."""

    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Schema for JWT token payload data."""

    user_id: int
    email: str


class UserResponse(BaseModel):
    """Schema for user data in API responses."""

    id: int
    email: str
    auth_provider: str
    created_at: int

    class Config:
        from_attributes = True
