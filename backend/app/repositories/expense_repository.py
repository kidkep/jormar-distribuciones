from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.expense import Expense


class ExpenseRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, expense_id: int) -> Expense | None:
        result = await self.db.execute(select(Expense).where(Expense.id == expense_id))
        return result.scalar_one_or_none()

    async def get_all(self, skip: int = 0, limit: int = 50, search: str = "") -> tuple[list[Expense], int]:
        query = select(Expense)
        count_query = select(func.count()).select_from(Expense)

        if search:
            query = query.where(Expense.description.ilike(f"%{search}%"))
            count_query = count_query.where(Expense.description.ilike(f"%{search}%"))

        total_result = await self.db.execute(count_query)
        total = total_result.scalar()

        query = query.order_by(Expense.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all()), total or 0

    async def get_total(self) -> float:
        result = await self.db.execute(select(func.coalesce(func.sum(Expense.amount), 0)))
        return float(result.scalar() or 0)

    async def create(self, expense: Expense) -> Expense:
        self.db.add(expense)
        await self.db.commit()
        await self.db.refresh(expense)
        return expense

    async def update(self, expense: Expense) -> Expense:
        await self.db.commit()
        await self.db.refresh(expense)
        return expense

    async def delete(self, expense: Expense) -> None:
        await self.db.delete(expense)
        await self.db.commit()
