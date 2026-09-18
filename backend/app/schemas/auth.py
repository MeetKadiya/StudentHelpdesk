"""Request/response schemas for auth endpoints."""

import uuid

from pydantic import BaseModel, ConfigDict, EmailStr


class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    role: str = "student"


class LoginRequest(BaseModel):
    email: str  # Email or Enrollment Number
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class UserOut(BaseModel):
    id: uuid.UUID
    email: EmailStr
    role: str
    name: str | None = None
    enrollment_number: str | None = None
    phone_number: str | None = None
    branch: str | None = None
    course: str | None = None
    semester: str | None = None

    model_config = ConfigDict(from_attributes=True)
