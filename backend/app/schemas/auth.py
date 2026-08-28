from pydantic import BaseModel

from app.schemas.user import UserResponse


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class RegisterRequest(BaseModel):
    email: str
    username: str
    full_name: str
    password: str
    role_id: int | None = None
