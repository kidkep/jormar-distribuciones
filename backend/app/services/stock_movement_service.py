from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from zoneinfo import ZoneInfo

from app.models.stock_movement import StockMovement
from app.models.product import Product
from app.repositories.stock_movement_repository import StockMovementRepository
from app.repositories.product_repository import ProductRepository
from app.schemas.stock_movement import StockAdjustCreate
from app.exceptions import NotFoundException, BadRequestException


class StockMovementService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = StockMovementRepository(db)
        self.product_repo = ProductRepository(db)

    async def get_movements(self, skip: int = 0, limit: int = 50) -> tuple[list[StockMovement], int]:
        return await self.repo.get_all(skip, limit)

    async def adjust_stock(self, data: StockAdjustCreate, user_id: int) -> StockMovement:
        product = await self.product_repo.get_by_id(data.product_id)
        if not product:
            raise NotFoundException("Producto", data.product_id)

        stock_before = product.current_stock

        if data.adjustment_type == "entrada":
            product.current_stock += data.quantity
            movement_type = "entrada"
            reason = data.reason or "Ajuste manual entrada de stock"
        elif data.adjustment_type == "salida":
            if stock_before < data.quantity:
                raise BadRequestException(
                    f"Stock insuficiente para {product.name}. "
                    f"Disponible: {stock_before}, solicitado: {data.quantity}"
                )
            product.current_stock -= data.quantity
            movement_type = "salida"
            reason = data.reason or "Ajuste manual salida de stock"
        else:
            raise BadRequestException("Tipo de ajuste invalido: use 'entrada' o 'salida'")

        await self.product_repo.update(product)

        movement = StockMovement(
            product_id=product.id,
            user_id=user_id,
            movement_type=movement_type,
            quantity=data.quantity,
            stock_before=stock_before,
            stock_after=product.current_stock,
            reason=reason,
            movement_date=datetime.now(ZoneInfo("America/Bogota")).replace(tzinfo=None),
        )

        return await self.repo.create(movement)
