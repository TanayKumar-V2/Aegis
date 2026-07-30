import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.models.user import UserRole


class UserRegister(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(min_length=8)
    role: UserRole
    specialty: str | None = None  # only meaningful if role == doctor


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: EmailStr
    role: UserRole
    specialty: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"