from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.models.purchase import Purchase, PurchaseItem, SupplierPayment
from app.models.supplier import Supplier
from app.models.product import Product


class PurchaseRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, purchase_id: int) -> Purchase | None:
        result = await self.db.execute(
            select(Purchase)
            .options(
                selectinload(Purchase.items).selectinload(PurchaseItem.product),
                selectinload(Purchase.supplier),
                selectinload(Purchase.user),
            )
            .where(Purchase.id == purchase_id)
        )
        return result.unique().scalar_one_or_none()

    async def get_all(self, skip: int = 0, limit: int = 50, search: str = "") -> tuple[list[Purchase], int]:
        query = select(Purchase).options(
            selectinload(Purchase.items).selectinload(PurchaseItem.product),
            selectinload(Purchase.supplier),
            selectinload(Purchase.user),
        )
        count_query = select(func.count()).select_from(Purchase)

        if search:
            query = query.where(Purchase.order_number.ilike(f"%{search}%"))
            count_query = count_query.where(Purchase.order_number.ilike(f"%{search}%"))

        total_result = await self.db.execute(count_query)
        total = total_result.scalar()

        query = query.order_by(Purchase.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(query)
        purchases = list(result.unique().scalars().all())

        return purchases, total or 0

    async def get_next_order_number(self) -> str:
        result = await self.db.execute(
            select(Purchase.order_number).order_by(Purchase.id.desc()).limit(1)
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

    async def create(self, purchase: Purchase) -> Purchase:
        self.db.add(purchase)
        await self.db.commit()
        await self.db.refresh(purchase)
        return purchase

    async def update(self, purchase: Purchase) -> Purchase:
        await self.db.commit()
        await self.db.refresh(purchase)
        return purchase


class SupplierPaymentRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, payment: SupplierPayment) -> SupplierPayment:
        self.db.add(payment)
        await self.db.commit()
        await self.db.refresh(payment)
        return payment

    async def get_by_purchase(self, purchase_id: int) -> list[SupplierPayment]:
        result = await self.db.execute(
            select(SupplierPayment).where(SupplierPayment.purchase_id == purchase_id)
        )
        return list(result.scalars().all())
