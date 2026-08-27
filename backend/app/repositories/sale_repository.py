from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from datetime import datetime

from app.models.sale import Sale, SaleItem


class SaleRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, sale_id: int) -> Sale | None:
        result = await self.db.execute(
            select(Sale)
            .options(
                selectinload(Sale.items).selectinload(SaleItem.product),
                selectinload(Sale.client),
                selectinload(Sale.user),
                selectinload(Sale.payments),
            )
            .where(Sale.id == sale_id)
        )
        return result.unique().scalar_one_or_none()

    async def get_by_invoice_number(self, invoice_number: str) -> Sale | None:
        result = await self.db.execute(
            select(Sale)
            .options(
                selectinload(Sale.items).selectinload(SaleItem.product),
                selectinload(Sale.client),
                selectinload(Sale.user),
                selectinload(Sale.payments),
            )
            .where(Sale.invoice_number == invoice_number)
        )
        return result.unique().scalar_one_or_none()

    async def get_all(self, skip: int = 0, limit: int = 50, search: str = "") -> tuple[list[Sale], int]:
        query = select(Sale).options(
            selectinload(Sale.items).selectinload(SaleItem.product),
            selectinload(Sale.client),
            selectinload(Sale.user),
        )

        if search:
            query = query.where(Sale.invoice_number.ilike(f"%{search}%"))

        count_query = select(func.count()).select_from(Sale)
        if search:
            count_query = count_query.where(Sale.invoice_number.ilike(f"%{search}%"))

        total_result = await self.db.execute(count_query)
        total = total_result.scalar()

        query = query.order_by(Sale.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(query)
        sales = list(result.unique().scalars().all())

        return sales, total or 0

    async def get_next_invoice_number(self) -> str:
        result = await self.db.execute(
            select(Sale.invoice_number).order_by(Sale.id.desc()).limit(1)
        )
        last = result.scalar_one_or_none()
        if last:
            try:
                num = int(last.split("-")[-1]) + 1
            except (ValueError, IndexError):
                num = 1
        else:
            num = 1
        return f"FAC-{num:06d}"

    async def create(self, sale: Sale) -> Sale:
        self.db.add(sale)
        await self.db.commit()
        await self.db.refresh(sale)
        return sale

    async def update(self, sale: Sale) -> Sale:
        await self.db.commit()
        await self.db.refresh(sale)
        return sale
