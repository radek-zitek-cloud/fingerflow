"""Authentication-related Pydantic schemas."""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class UserCreate(BaseModel):
    """Schema for user registration."""

    email: EmailStr
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")


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
