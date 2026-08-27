from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from app.database import get_db
from app.dependencies import require_permission
from app.models.user import User
from app.models.sale import Sale
from app.models.expense import Expense
from app.models.payment import Payment
from app.models.retiro import Retiro

router = APIRouter(prefix="/caja", tags=["Caja"])


@router.get("/resumen")
async def get_caja_resumen(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("finanzas.view")),
):
    today = datetime.now(ZoneInfo("America/Bogota")).replace(tzinfo=None, hour=0, minute=0, second=0, microsecond=0)
    month_start = today.replace(day=1)

    # Ventas de hoy (excepto anuladas)
    sales_today_q = await db.execute(
        select(func.coalesce(func.sum(Sale.total), 0)).where(
            Sale.sale_date >= today, Sale.status != "anulada"
        )
    )
    ventas_hoy = float(sales_today_q.scalar() or 0)

    # Ventas del mes
    sales_month_q = await db.execute(
        select(func.coalesce(func.sum(Sale.total), 0)).where(
            Sale.sale_date >= month_start, Sale.status != "anulada"
        )
    )
    ventas_mes = float(sales_month_q.scalar() or 0)

    # Ventas por metodo de pago (hoy)
    methods = ["efectivo", "nequi", "bancolombia", "bogota", "credito"]
    por_metodo = {}
    for m in methods:
        r = await db.execute(
            select(func.coalesce(func.sum(Sale.total), 0)).where(
                Sale.sale_date >= today, Sale.status != "anulada", Sale.payment_method == m
            )
        )
        por_metodo[m] = float(r.scalar() or 0)

    # --- DINERO TOTAL POR METODO (todo el historial) ---
    total_por_metodo = {}
    for m in methods:
        r = await db.execute(
            select(func.coalesce(func.sum(Sale.total), 0)).where(
                Sale.status != "anulada", Sale.payment_method == m
            )
        )
        total_por_metodo[m] = float(r.scalar() or 0)

    # Total abonos recibidos (todo el historial)
    total_abonos_q = await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0))
    )
    total_abonos = float(total_abonos_q.scalar() or 0)

    # Abonos por metodo de pago (como se recibio el dinero: Nequi, Bancolombia, etc.)
    abonos_por_metodo = {}
    for m in methods:
        if m == "credito":
            abonos_por_metodo[m] = 0.0  # credito no recibe abonos directamente
            continue
        r = await db.execute(
            select(func.coalesce(func.sum(Payment.amount), 0)).where(Payment.payment_method == m)
        )
        abonos_por_metodo[m] = float(r.scalar() or 0)

    # Total gastos (todo el historial)
    total_gastos_q = await db.execute(
        select(func.coalesce(func.sum(Expense.amount), 0))
    )
    total_gastos_all = float(total_gastos_q.scalar() or 0)

    # Gastos por metodo
    gastos_por_metodo = {}
    for m in methods:
        r = await db.execute(
            select(func.coalesce(func.sum(Expense.amount), 0)).where(Expense.payment_method == m)
        )
        gastos_por_metodo[m] = float(r.scalar() or 0)

    # Total retiros por metodo de origen
    retiros_q = await db.execute(
        select(Retiro.source_method, func.coalesce(func.sum(Retiro.amount), 0)).group_by(Retiro.source_method)
    )
    retiros_por_metodo = {row[0]: float(row[1]) for row in retiros_q.all()}

    total_retiro_q = await db.execute(
        select(func.coalesce(func.sum(Retiro.amount), 0))
    )
    total_retiros = float(total_retiro_q.scalar() or 0)

    # Saldo disponible por metodo
    # Credito: vendido - total_abonos (porque los abonos ya entraron a otros metodos)
    # Otros: vendido + abonos recibidos en ese metodo - gastos - retiros
    saldo_por_metodo = {}
    for m in methods:
        vendido = total_por_metodo.get(m, 0)
        gastos_m = gastos_por_metodo.get(m, 0)
        retiros_m = retiros_por_metodo.get(m, 0)
        if m == "credito":
            saldo_por_metodo[m] = vendido - total_abonos
        else:
            abonos_m = abonos_por_metodo.get(m, 0)
            saldo_por_metodo[m] = vendido + abonos_m - gastos_m - retiros_m

    total_general = sum(saldo_por_metodo.values())

    # Gastos de hoy
    expenses_today_q = await db.execute(
        select(func.coalesce(func.sum(Expense.amount), 0)).where(
            Expense.expense_date >= today
        )
    )
    gastos_hoy = float(expenses_today_q.scalar() or 0)

    # Gastos del mes
    expenses_month_q = await db.execute(
        select(func.coalesce(func.sum(Expense.amount), 0)).where(
            Expense.expense_date >= month_start
        )
    )
    gastos_mes = float(expenses_month_q.scalar() or 0)

    # Abonos recibidos hoy (creditos)
    payments_today_q = await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(
            Payment.payment_date >= today
        )
    )
    abonos_hoy = float(payments_today_q.scalar() or 0)

    # Total deuda pendiente
    total_debt_q = await db.execute(
        select(func.coalesce(func.sum(Sale.total), 0)).where(
            Sale.payment_method == "credito", Sale.status != "anulada"
        )
    )
    total_deuda = float(total_debt_q.scalar() or 0)

    total_pagos_q = await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0))
    )
    total_pagos = float(total_pagos_q.scalar() or 0)
    deuda_pendiente = max(total_deuda - total_pagos, 0)

    # Ultimos 15 movimientos (ventas + gastos + retiros + abonos)
    recent_sales_q = await db.execute(
        select(Sale).where(Sale.status != "anulada").order_by(Sale.created_at.desc()).limit(10)
    )
    recent_expenses_q = await db.execute(
        select(Expense).order_by(Expense.created_at.desc()).limit(10)
    )
    recent_retiros_q = await db.execute(
        select(Retiro).order_by(Retiro.created_at.desc()).limit(10)
    )
    recent_payments_q = await db.execute(
        select(Payment).order_by(Payment.created_at.desc()).limit(10)
    )

    movimientos = []
    for s in recent_sales_q.scalars().all():
        movimientos.append({
            "tipo": "ingreso",
            "descripcion": f"Venta {s.invoice_number}",
            "monto": float(s.total),
            "metodo": s.payment_method,
            "fecha": (s.created_at or s.sale_date or datetime.min).isoformat(),
        })
    for p in recent_payments_q.scalars().all():
        movimientos.append({
            "tipo": "ingreso",
            "descripcion": f"Abono venta #{p.sale_id}",
            "monto": float(p.amount),
            "metodo": p.payment_method,
            "fecha": (p.created_at or p.payment_date or datetime.min).isoformat(),
        })
    for e in recent_expenses_q.scalars().all():
        movimientos.append({
            "tipo": "egreso",
            "descripcion": e.description,
            "monto": float(e.amount),
            "metodo": e.payment_method,
            "fecha": (e.created_at or e.expense_date or datetime.min).isoformat(),
        })
    for r in recent_retiros_q.scalars().all():
        movimientos.append({
            "tipo": "egreso",
            "descripcion": f"Saque: {r.description}",
            "monto": float(r.amount),
            "metodo": r.source_method,
            "fecha": (r.created_at or r.retiro_date or datetime.min).isoformat(),
        })

    movimientos.sort(key=lambda x: x["fecha"], reverse=True)
    movimientos = movimientos[:15]

    return {
        "ventas_hoy": ventas_hoy,
        "ventas_mes": ventas_mes,
        "gastos_hoy": gastos_hoy,
        "gastos_mes": gastos_mes,
        "abonos_hoy": abonos_hoy,
        "deuda_pendiente": deuda_pendiente,
        "ganancia_neta_hoy": ventas_hoy - gastos_hoy,
        "ganancia_neta_mes": ventas_mes - gastos_mes,
        "por_metodo": por_metodo,
        "movimientos": movimientos,
        "saldo_total": total_general,
        "saldo_por_metodo": saldo_por_metodo,
        "total_retiros": total_retiros,
    }
