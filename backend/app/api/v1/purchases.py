from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_permission
from app.models.user import User
from app.schemas.purchase import (
    PurchaseCreate, PurchaseResponse, SupplierPaymentCreate,
    SupplierPaymentResponse, SupplierAccountResponse,
)
from app.schemas.common import MessageResponse
from app.services.purchase_service import PurchaseService
from app.utils.audit import record_audit

router = APIRouter(prefix="/purchases", tags=["Compras"])
payable_router = APIRouter(prefix="/accounts-payable", tags=["Cuentas por Pagar"])


@router.get("", response_model=list[PurchaseResponse])
async def list_purchases(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    search: str = Query("", max_length=100),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("compras.view")),
):
    service = PurchaseService(db)
    skip = (page - 1) * size
    purchases, total = await service.get_purchases(skip, size, search)
    return purchases


@router.get("/{purchase_id}", response_model=PurchaseResponse)
async def get_purchase(
    purchase_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("compras.view")),
):
    service = PurchaseService(db)
    return await service.get_purchase(purchase_id)


@router.post("", response_model=PurchaseResponse, status_code=201)
async def create_purchase(
    data: PurchaseCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("compras.create")),
):
    service = PurchaseService(db)
    purchase = await service.create_purchase(data, user.id)
    record_audit(
        db, user, "create", "purchase",
        entity_id=purchase.id,
        new_values={"order_number": purchase.order_number, "total": str(purchase.total)},
    )
    return purchase


@router.post("/{purchase_id}/payments", response_model=SupplierPaymentResponse, status_code=201)
async def register_supplier_payment(
    purchase_id: int,
    data: SupplierPaymentCreate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("cuentas_pagar.gestionar")),
):
    service = PurchaseService(db)
    return await service.register_supplier_payment(purchase_id, data)


@payable_router.get("", response_model=list[SupplierAccountResponse])
async def list_accounts_payable(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    search: str = Query("", max_length=100),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("cuentas_pagar.view")),
):
    service = PurchaseService(db)
    skip = (page - 1) * size
    accounts, total = await service.get_supplier_accounts(skip, size, search)
    return accounts


@payable_router.get("/summary")
async def payable_summary(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("cuentas_pagar.view")),
):
    service = PurchaseService(db)
    return await service.get_payable_summary()
