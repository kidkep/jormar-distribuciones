from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.models.stock_movement import StockMovement
from app.models.product import Product
from app.models.user import User


class StockMovementRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self, skip: int = 0, limit: int = 50) -> tuple[list[StockMovement], int]:
        query = (
            select(StockMovement)
            .options(selectinload(StockMovement.product), selectinload(StockMovement.user))
            .order_by(StockMovement.created_at.desc())
        )
        count_query = select(func.count()).select_from(StockMovement)

        total_result = await self.db.execute(count_query)
        total = total_result.scalar()

        result = await self.db.execute(query.offset(skip).limit(limit))
        movements = list(result.scalars().all())
        return movements, total or 0

    async def create(self, movement: StockMovement) -> StockMovement:
        self.db.add(movement)
        await self.db.commit()
        await self.db.refresh(movement)
        return movement
