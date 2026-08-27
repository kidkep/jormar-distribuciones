from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_permission
from app.models.user import User
from app.schemas.debtor import DebtorResponse, PaymentCreate, PaymentResponse
from app.schemas.common import MessageResponse
from app.services.debtor_service import DebtorService

router = APIRouter(prefix="/debtors", tags=["Deudores"])


@router.get("", response_model=list[DebtorResponse])
async def list_debtors(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("deudores.view")),
):
    service = DebtorService(db)
    skip = (page - 1) * size
    debtors, total = await service.get_debtors(skip, size)
    return debtors


@router.post("/{sale_id}/payments", response_model=PaymentResponse, status_code=201)
async def register_payment(
    sale_id: int,
    data: PaymentCreate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("deudores.gestionar")),
):
    service = DebtorService(db)
    return await service.register_payment(sale_id, data)
