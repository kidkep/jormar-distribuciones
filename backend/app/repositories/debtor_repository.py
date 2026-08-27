from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.models.sale import Sale, SaleItem
from app.models.payment import Payment


class DebtorRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_credit_sales(self, skip: int = 0, limit: int = 50) -> tuple[list[Sale], int]:
        query = (
            select(Sale)
            .options(
                selectinload(Sale.client),
                selectinload(Sale.items).selectinload(SaleItem.product),
                selectinload(Sale.payments),
            )
            .where(Sale.payment_method == "credito")
            .where(Sale.status != "anulada")
            .order_by(Sale.created_at.desc())
        )

        count_query = (
            select(func.count())
            .select_from(Sale)
            .where(Sale.payment_method == "credito")
            .where(Sale.status != "anulada")
        )

        total_result = await self.db.execute(count_query)
        total = total_result.scalar()

        result = await self.db.execute(query.offset(skip).limit(limit))
        sales = list(result.unique().scalars().all())

        return sales, total or 0

    async def create_payment(self, payment: Payment) -> Payment:
        self.db.add(payment)
        await self.db.commit()
        await self.db.refresh(payment)
        return payment
