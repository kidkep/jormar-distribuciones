from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.models.purchase_order import PurchaseOrder, PurchaseOrderItem


class PurchaseOrderRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, order_id: int) -> PurchaseOrder | None:
        result = await self.db.execute(
            select(PurchaseOrder)
            .options(
                selectinload(PurchaseOrder.items).selectinload(PurchaseOrderItem.product),
                selectinload(PurchaseOrder.supplier),
                selectinload(PurchaseOrder.user),
            )
            .where(PurchaseOrder.id == order_id)
        )
        return result.unique().scalar_one_or_none()

    async def get_all(self, skip: int = 0, limit: int = 50, search: str = "") -> tuple[list[PurchaseOrder], int]:
        query = select(PurchaseOrder).options(
            selectinload(PurchaseOrder.items).selectinload(PurchaseOrderItem.product),
            selectinload(PurchaseOrder.supplier),
            selectinload(PurchaseOrder.user),
        )

        count_query = select(func.count()).select_from(PurchaseOrder)
        if search:
            filter_condition = PurchaseOrder.order_number.ilike(f"%{search}%") | PurchaseOrder.supplier_name.ilike(f"%{search}%")
            query = query.where(filter_condition)
            count_query = count_query.where(filter_condition)

        total_result = await self.db.execute(count_query)
        total = total_result.scalar()

        query = query.order_by(PurchaseOrder.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(query)
        orders = list(result.unique().scalars().all())

        return orders, total or 0

    async def get_next_order_number(self) -> str:
        result = await self.db.execute(
            select(PurchaseOrder.order_number).order_by(PurchaseOrder.id.desc()).limit(1)
        )
        last = result.scalar_one_or_none()
        if last:
            try:
                num = int(last.split("-")[-1]) + 1
            except (ValueError, IndexError):
                num = 1
        else:
            num = 1
        return f"OC-{num:06d}"

    async def create(self, order: PurchaseOrder) -> PurchaseOrder:
        self.db.add(order)
        await self.db.commit()
        await self.db.refresh(order)
        return order

    async def update(self, order: PurchaseOrder) -> PurchaseOrder:
        await self.db.commit()
        await self.db.refresh(order)
        return order
