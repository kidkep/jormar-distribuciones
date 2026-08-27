from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from app.database import get_db
from app.dependencies import require_permission
from app.models.user import User
from app.schemas.distribution import DistributionResponse, DistributionSummary, DistributionConfig
from app.services.distribution_service import DistributionService

router = APIRouter(prefix="/distributions", tags=["Distribuciones"])


@router.get("", response_model=list[DistributionResponse])
async def list_distributions(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("finanzas.view")),
):
    service = DistributionService(db)
    skip = (page - 1) * size
    return await service.get_all(skip, size)


@router.get("/summary", response_model=DistributionSummary)
async def get_summary(
    fecha_inicio: datetime | None = Query(None),
    fecha_fin: datetime | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("finanzas.view")),
):
    service = DistributionService(db)
    return await service.get_summary(fecha_inicio, fecha_fin)


@router.get("/config", response_model=DistributionConfig)
async def get_config(
    _user: User = Depends(require_permission("finanzas.view")),
):
    service = DistributionService(None)
    return await service.get_config()
