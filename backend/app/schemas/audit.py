from pydantic import BaseModel
from datetime import datetime


class AuditLogResponse(BaseModel):
    id: int
    user_id: int | None = None
    username: str | None = None
    full_name: str | None = None
    action: str
    entity_type: str
    entity_id: str | None = None
    old_values: str | None = None
    new_values: str | None = None
    ip_address: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
