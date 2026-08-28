from datetime import datetime

from pydantic import BaseModel


class HealthCheckResponse(BaseModel):
    id: int
    status: str
    latency_ms: int | None
    created_at: datetime

    model_config = {"from_attributes": True}


class HealthStatusResponse(BaseModel):
    status: str
    database: str
    latency_ms: int | None
    checked_at: datetime
    uptime_today: float | None
    uptime_7d: float | None
    recent_checks: list[HealthCheckResponse]