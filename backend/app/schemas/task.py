from pydantic import BaseModel, Field
from datetime import datetime


class TaskCreate(BaseModel):
    title: str
    description: str | None = None
    task_type: str = "general"
    client_id: int | None = None
    user_id: int | None = None
    due_date: datetime | None = None
    priority: str = "media"


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    task_type: str | None = None
    client_id: int | None = None
    user_id: int | None = None
    due_date: datetime | None = None
    status: str | None = None
    priority: str | None = None


class TaskResponse(BaseModel):
    id: int
    title: str
    description: str | None = None
    task_type: str
    client_id: int | None = None
    client_name: str | None = None
    user_id: int | None = None
    assignee_name: str | None = None
    due_date: datetime | None = None
    status: str
    priority: str
    created_by: int
    creator_name: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
