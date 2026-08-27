from pydantic import BaseModel
from datetime import datetime

from app.schemas.common import TimestampSchema


class UserBase(BaseModel):
    email: str
    username: str
    full_name: str


class UserCreate(UserBase):
    password: str
    role_id: int | None = None
    is_active: bool = True
    is_superuser: bool = False


class UserUpdate(BaseModel):
    email: str | None = None
    username: str | None = None
    full_name: str | None = None
    password: str | None = None
    role_id: int | None = None
    is_active: bool | None = None
    is_superuser: bool | None = None


class UserChangePassword(BaseModel):
    current_password: str
    new_password: str


class RoleBrief(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class UserResponse(UserBase, TimestampSchema):
    id: int
    is_active: bool
    is_superuser: bool
    role_id: int | None = None
    role: RoleBrief | None = None
    permissions: list[str] = []

    model_config = {"from_attributes": True}


class UserBrief(BaseModel):
    id: int
    username: str
    full_name: str

    model_config = {"from_attributes": True}
