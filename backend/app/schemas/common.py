from pydantic import BaseModel
from datetime import datetime


class MessageResponse(BaseModel):
    message: str
    detail: str | None = None


class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    size: int
    pages: int


class TimestampSchema(BaseModel):
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
