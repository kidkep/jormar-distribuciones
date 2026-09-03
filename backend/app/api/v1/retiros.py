from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from app.database import get_db
from app.dependencies import require_permission
from app.models.user import User
from app.models.retiro import Retiro
from app.models.sale import Sale
from app.models.expense import Expense
from app.models.payment import Payment

router = APIRouter(prefix="/retiros", tags=["Retiros"])


class RetiroCreate(BaseModel):
    amount: float
    source_method: str
    description: str
    retiro_date: str = ""
    reference: str = ""
    notes: str = ""
    distribution_category: str = "utilidad"


class RetiroOut(BaseModel):
    id: int
    amount: float
    source_method: str
    description: str
    retiro_date: str
    reference: str | None
    notes: str | None
    distribution_category: str
    user_name: str
    created_at: str | None

    class Config:
        from_attributes = True


@router.get("")
async def get_retiros(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("finanzas.view")),
):
    result = await db.execute(
        select(Retiro).order_by(Retiro.created_at.desc())
    )
    retiros = result.scalars().all()
    out = []
    for r in retiros:
        user_q = await db.execute(select(User).where(User.id == r.user_id))
        user = user_q.scalar_one_or_none()
        out.append(RetiroOut(
            id=r.id,
            amount=float(r.amount),
            source_method=r.source_method,
            description=r.description,
            retiro_date=r.retiro_date.strftime("%Y-%m-%d") if r.retiro_date else "",
            reference=r.reference,
            notes=r.notes,
            distribution_category=r.distribution_category,
            user_name=user.username if user else "Desconocido",
            created_at=r.created_at.strftime("%Y-%m-%d %H:%M") if r.created_at else "",
        ))
    return out


@router.post("")
async def create_retiro(
    data: RetiroCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("finanzas.view")),
):
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="El monto debe ser mayor a 0")

    if data.source_method == "credito":
        raise HTTPException(status_code=400, detail="No se puede hacer retiros desde credito")

    valid_categories = {"utilidad", "inversion", "costos"}
    if data.distribution_category not in valid_categories:
        raise HTTPException(status_code=400, detail="Categoria de saque invalida")

    methods = ["efectivo", "nequi", "bancolombia", "bogota"]

    total_por_metodo = {}
    for m in methods:
        r = await db.execute(
            select(func.coalesce(func.sum(Sale.total), 0)).where(
                Sale.status != "anulada", Sale.payment_method == m
            )
        )
        total_por_metodo[m] = float(r.scalar() or 0)

    total_abonos_q = await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0))
    )
    total_abonos = float(total_abonos_q.scalar() or 0)

    abonos_por_metodo = {}
    for m in methods:
        r = await db.execute(
            select(func.coalesce(func.sum(Payment.amount), 0)).where(Payment.payment_method == m)
        )
        abonos_por_metodo[m] = float(r.scalar() or 0)

    gastos_por_metodo = {}
    for m in methods:
        r = await db.execute(
            select(func.coalesce(func.sum(Expense.amount), 0)).where(Expense.payment_method == m)
        )
        gastos_por_metodo[m] = float(r.scalar() or 0)

    saldo_por_metodo = {}
    for m in methods:
        vendido = total_por_metodo.get(m, 0)
        abonos_m = abonos_por_metodo.get(m, 0)
        gastos_m = gastos_por_metodo.get(m, 0)
        # Los saques ya se registran como Gasto (ver abajo), asi que no se restan
        # aqui por separado para evitar doble descuento.
        saldo_por_metodo[m] = vendido + abonos_m - gastos_m

    saldo_disponible = saldo_por_metodo.get(data.source_method, 0)

    if data.amount > saldo_disponible:
        raise HTTPException(
            status_code=400,
            detail=f"Saldo insuficiente en {data.source_method}. "
                   f"Disponible: ${saldo_disponible:,.0f}, solicitado: ${data.amount:,.0f}"
        )

    retiro_date = datetime.strptime(data.retiro_date, "%Y-%m-%d") if data.retiro_date else datetime.now(ZoneInfo("America/Bogota")).replace(tzinfo=None)

    retiro = Retiro(
        amount=data.amount,
        source_method=data.source_method,
        description=data.description,
        retiro_date=retiro_date,
        reference=data.reference if data.reference else None,
        notes=data.notes if data.notes else None,
        distribution_category=data.distribution_category,
        user_id=user.id,
    )
    db.add(retiro)
    await db.flush()

    # El saque tambien se registra como Gasto/Costo para que se refleje en la
    # pagina de "Gastos y Costos". Asi no se descuenta dos veces del balance.
    expense = Expense(
        description=f"Saque: {data.description}",
        amount=data.amount,
        category="general",
        expense_date=retiro_date,
        payment_method=data.source_method,
        reference=data.reference if data.reference else None,
        notes=data.notes if data.notes else None,
        distribution_category=data.distribution_category,
        retiro_id=retiro.id,
        user_id=user.id,
    )
    db.add(expense)
    await db.commit()
    return {"message": "Retiro registrado", "id": retiro.id}


@router.delete("/{retiro_id}")
async def delete_retiro(
    retiro_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("finanzas.view")),
):
    result = await db.execute(select(Retiro).where(Retiro.id == retiro_id))
    retiro = result.scalar_one_or_none()
    if not retiro:
        return {"error": "No encontrado"}
    exp_q = await db.execute(select(Expense).where(Expense.retiro_id == retiro.id))
    expense = exp_q.scalar_one_or_none()
    if expense:
        await db.delete(expense)
    await db.delete(retiro)
    await db.commit()
    return {"message": "Retiro eliminado"}
