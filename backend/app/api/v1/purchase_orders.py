from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_permission
from app.models.user import User
from app.schemas.purchase import PurchaseOrderCreate, PurchaseOrderResponse
from app.schemas.common import MessageResponse
from app.services.purchase_service import PurchaseOrderService
from app.utils.audit import record_audit

router = APIRouter(prefix="/purchase-orders", tags=["Solicitudes de Pedido"])


@router.get("", response_model=list[PurchaseOrderResponse])
async def list_orders(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    search: str = Query("", max_length=100),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("compras.view")),
):
    service = PurchaseOrderService(db)
    skip = (page - 1) * size
    orders, total = await service.get_orders(skip, size, search)
    return orders


@router.get("/{order_id}", response_model=PurchaseOrderResponse)
async def get_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("compras.view")),
):
    service = PurchaseOrderService(db)
    return await service.get_order(order_id)


@router.post("", response_model=PurchaseOrderResponse, status_code=201)
async def create_order(
    data: PurchaseOrderCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("compras.create")),
):
    service = PurchaseOrderService(db)
    order = await service.create_order(data, user.id)
    record_audit(
        db, user, "create", "purchase_order",
        entity_id=order.id,
        new_values={"order_number": getattr(order, "order_number", None), "total": str(getattr(order, "total", ""))},
    )
    return order


@router.put("/{order_id}/status", response_model=PurchaseOrderResponse)
async def update_order_status(
    order_id: int,
    status: str,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("compras.edit")),
):
    service = PurchaseOrderService(db)
    order = await service.get_order(order_id)
    updated = await service.update_status(order_id, status)
    record_audit(
        db, _user, "update", "purchase_order",
        entity_id=order_id,
        old_values={"status": order.status},
        new_values={"status": updated.status},
    )
    return updated


@router.delete("/{order_id}", response_model=MessageResponse)
async def delete_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("compras.edit")),
):
    service = PurchaseOrderService(db)
    existing = await service.get_order(order_id)
    await service.delete_order(order_id)
    record_audit(
        db, _user, "delete", "purchase_order",
        entity_id=order_id,
        old_values={"order_number": getattr(existing, "order_number", None), "status": existing.status},
    )
    return MessageResponse(message="Solicitud de pedido eliminada correctamente")
