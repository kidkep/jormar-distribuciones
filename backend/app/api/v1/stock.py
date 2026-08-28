from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_permission
from app.models.user import User
from app.schemas.stock_movement import StockAdjustCreate, StockMovementResponse
from app.schemas.common import MessageResponse
from app.services.stock_movement_service import StockMovementService
from app.utils.audit import record_audit

router = APIRouter(prefix="/inventory", tags=["Inventario"])


@router.get("/movements", response_model=list[StockMovementResponse])
async def list_movements(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("inventario.view")),
):
    service = StockMovementService(db)
    skip = (page - 1) * size
    movements, total = await service.get_movements(skip, size)
    return movements


@router.post("/adjust", response_model=StockMovementResponse, status_code=201)
async def adjust_stock(
    data: StockAdjustCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("inventario.ajustes")),
):
    service = StockMovementService(db)
    movement = await service.adjust_stock(data, user.id)
    record_audit(
        db, user, "adjust", "stock_movement",
        entity_id=movement.id,
        new_values={
            "product_id": movement.product_id,
            "type": movement.movement_type,
            "quantity": movement.quantity,
            "stock_after": movement.stock_after,
        },
    )
    return movement
