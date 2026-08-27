from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_permission
from app.models.user import User
from app.schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseResponse
from app.schemas.common import MessageResponse
from app.services.expense_service import ExpenseService

router = APIRouter(prefix="/expenses", tags=["Gastos"])


@router.get("", response_model=list[ExpenseResponse])
async def list_expenses(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    search: str = Query("", max_length=100),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("finanzas.gastos")),
):
    service = ExpenseService(db)
    skip = (page - 1) * size
    expenses, total = await service.get_expenses(skip, size, search)
    return expenses


@router.get("/total")
async def get_expenses_total(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("finanzas.view")),
):
    service = ExpenseService(db)
    return {"total": await service.get_total()}


@router.get("/{expense_id}", response_model=ExpenseResponse)
async def get_expense(
    expense_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("finanzas.gastos")),
):
    service = ExpenseService(db)
    return await service.get_expense(expense_id)


@router.post("", response_model=ExpenseResponse, status_code=201)
async def create_expense(
    data: ExpenseCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("finanzas.gastos")),
):
    service = ExpenseService(db)
    return await service.create_expense(data, user.id)


@router.put("/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: int,
    data: ExpenseUpdate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("finanzas.gastos")),
):
    service = ExpenseService(db)
    return await service.update_expense(expense_id, data)


@router.delete("/{expense_id}", response_model=MessageResponse)
async def delete_expense(
    expense_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("finanzas.gastos")),
):
    service = ExpenseService(db)
    await service.delete_expense(expense_id)
    return MessageResponse(message="Gasto eliminado correctamente")
