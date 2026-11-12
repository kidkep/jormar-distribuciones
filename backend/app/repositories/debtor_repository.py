from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, case
from sqlalchemy.orm import selectinload

from app.models.client import Client
from app.models.sale import Sale, SaleItem
from app.models.payment import Payment


class DebtorRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_credit_sales(
        self, skip: int = 0, limit: int = 50, search: str = ""
    ) -> tuple[list[Sale], int]:
        query = (
            select(Sale)
            .options(
                selectinload(Sale.client),
                selectinload(Sale.items).selectinload(SaleItem.product),
                selectinload(Sale.payments),
            )
            .where(Sale.payment_method == "credito")
        )

        count_query = (
            select(func.count())
            .select_from(Sale)
            .where(Sale.payment_method == "credito")
        )

        if search.strip():
            pattern = f"%{search.strip()}%"
            condition = or_(
                Sale.invoice_number.ilike(pattern),
                Sale.client_name.ilike(pattern),
                Sale.client.has(Client.document_number.ilike(pattern)),
            )
            query = query.where(condition)
            count_query = count_query.where(condition)

        query = query.order_by(
            case((Sale.status == "anulada", 1), else_=0),
            Sale.created_at.desc(),
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
