import time
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter
from sqlalchemy import select, func, case, text

from app.database import engine, AsyncSessionLocal
from app.models.health_check import HealthCheck
from app.schemas.health import HealthCheckResponse, HealthStatusResponse

router = APIRouter(prefix="/health", tags=["Salud"])


async def _ping_db() -> tuple[str, int | None]:
    try:
        start = time.perf_counter()
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        latency_ms = int((time.perf_counter() - start) * 1000)
        return "up", latency_ms
    except Exception:
        return "down", None


@router.get("/status", response_model=HealthStatusResponse)
async def health_status():
    status, latency_ms = await _ping_db()
    checked_at = datetime.now(timezone.utc)

    recent_checks: list[HealthCheckResponse] = []
    uptime_today: float | None = None
    uptime_7d: float | None = None

    if status == "up":
        try:
            async with AsyncSessionLocal() as session:
                session.add(HealthCheck(status="up", latency_ms=latency_ms))
                await session.commit()

                today_start = datetime.now(timezone.utc).replace(
                    hour=0, minute=0, second=0, microsecond=0
                )
                week_start = today_start - timedelta(days=6)

                count_expr = func.count(HealthCheck.id)
                up_expr = func.sum(
                    case((HealthCheck.status == "up", 1), else_=0)
                )

                result = await session.execute(
                    select(count_expr, up_expr).where(
                        HealthCheck.created_at >= today_start
                    )
                )
                count_today, up_today = result.one()
                uptime_today = (
                    round(up_today / count_today * 100, 1) if count_today else None
                )

                result = await session.execute(
                    select(count_expr, up_expr).where(
                        HealthCheck.created_at >= week_start
                    )
                )
                count_7d, up_7d = result.one()
                uptime_7d = (
                    round(up_7d / count_7d * 100, 1) if count_7d else None
                )

                result = await session.execute(
                    select(HealthCheck)
                    .order_by(HealthCheck.created_at.desc())
                    .limit(30)
                )
                recent_checks = [
                    HealthCheckResponse.model_validate(r)
                    for r in result.scalars().all()
                ]
        except Exception:
            pass

    return HealthStatusResponse(
        status=status,
        database=status,
        latency_ms=latency_ms,
        checked_at=checked_at,
        uptime_today=uptime_today,
        uptime_7d=uptime_7d,
        recent_checks=recent_checks,
    )