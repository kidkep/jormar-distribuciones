from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_superuser
from app.models.user import User
from app.schemas.audit import AuditLogResponse
from app.services.audit_service import AuditService

router = APIRouter(prefix="/audit", tags=["Auditoria"])


@router.get("", response_model=list[AuditLogResponse])
async def list_audit(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    entity_type: str | None = Query(None, max_length=50),
    action: str | None = Query(None, max_length=50),
    username: str | None = Query(None, max_length=100),
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_superuser),
):
    service = AuditService(db)
    skip = (page - 1) * size
    logs, _total = await service.list_logs(
        skip, size, entity_type=entity_type, action=action, username=username
    )
    return logs
