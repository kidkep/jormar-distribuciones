from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from app.models.expense import Expense
from app.repositories.expense_repository import ExpenseRepository
from app.schemas.expense import ExpenseCreate, ExpenseUpdate
from app.exceptions import NotFoundException


class ExpenseService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ExpenseRepository(db)

    async def get_expense(self, expense_id: int) -> Expense:
        expense = await self.repo.get_by_id(expense_id)
        if not expense:
            raise NotFoundException("Gasto", expense_id)
        return expense

    async def get_expenses(self, skip: int = 0, limit: int = 50, search: str = "") -> tuple[list[Expense], int]:
        return await self.repo.get_all(skip, limit, search)

    async def get_total(self) -> float:
        return await self.repo.get_total()

    async def create_expense(self, data: ExpenseCreate, user_id: int) -> Expense:
        expense = Expense(
            description=data.description,
            amount=float(data.amount),
            category=data.category,
            expense_date=data.expense_date or datetime.now(ZoneInfo("America/Bogota")).replace(tzinfo=None),
            payment_method=data.payment_method,
            reference=data.reference,
            notes=data.notes,
            user_id=user_id,
        )
        return await self.repo.create(expense)

    async def update_expense(self, expense_id: int, data: ExpenseUpdate) -> Expense:
        expense = await self.get_expense(expense_id)
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(expense, key, float(value) if key == "amount" else value)
        return await self.repo.update(expense)

    async def delete_expense(self, expense_id: int) -> None:
        expense = await self.get_expense(expense_id)
        await self.repo.delete(expense)
