from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from app.database import get_db
from app.dependencies import require_permission
from app.models.user import User
from app.models.product import Product
from app.models.client import Client
from app.models.supplier import Supplier
from app.models.sale import Sale, SaleItem
from app.models.payment import Payment

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats")
async def get_stats(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("reportes.ver")),
):
    today = datetime.now(ZoneInfo("America/Bogota")).replace(tzinfo=None, hour=0, minute=0, second=0, microsecond=0)
    month_start = today.replace(day=1)

    total_products = (await db.execute(select(func.count()).select_from(Product).where(Product.is_active == True))).scalar() or 0
    total_clients = (await db.execute(select(func.count()).select_from(Client).where(Client.is_active == True))).scalar() or 0
    total_suppliers = (await db.execute(select(func.count()).select_from(Supplier).where(Supplier.is_active == True))).scalar() or 0

    low_stock = (await db.execute(
        select(func.count()).select_from(Product).where(Product.is_active == True, Product.current_stock <= Product.min_stock)
    )).scalar() or 0

    sales_today_result = await db.execute(
        select(func.coalesce(func.sum(Sale.total), 0)).where(
            Sale.sale_date >= today, Sale.status != "anulada"
        )
    )
    sales_today = float(sales_today_result.scalar() or 0)

    sales_month_result = await db.execute(
        select(func.coalesce(func.sum(Sale.total), 0)).where(
            Sale.sale_date >= month_start, Sale.status != "anulada"
        )
    )
    sales_month = float(sales_month_result.scalar() or 0)

    sales_count_today = (await db.execute(
        select(func.count()).select_from(Sale).where(Sale.sale_date >= today, Sale.status != "anulada")
    )).scalar() or 0

    sales_count_month = (await db.execute(
        select(func.count()).select_from(Sale).where(Sale.sale_date >= month_start, Sale.status != "anulada")
    )).scalar() or 0

    debtors_result = await db.execute(
        select(func.coalesce(func.sum(Sale.total), 0)).where(
            Sale.payment_method == "credito", Sale.status != "anulada"
        )
    )
    total_debt = float(debtors_result.scalar() or 0)

    payments_result = await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0))
    )
    total_payments = float(payments_result.scalar() or 0)

    total_debt_balance = total_debt - total_payments

    recent_sales_result = await db.execute(
        select(Sale).where(Sale.status != "anulada").order_by(Sale.created_at.desc()).limit(5)
    )
    recent_sales = [
        {
            "id": s.id,
            "invoice_number": s.invoice_number,
            "total": float(s.total),
            "sale_date": s.sale_date.isoformat(),
        }
        for s in recent_sales_result.scalars().all()
    ]

    return {
        "total_products": total_products,
        "total_clients": total_clients,
        "total_suppliers": total_suppliers,
        "low_stock_products": low_stock,
        "sales_today": sales_today,
        "sales_month": sales_month,
        "sales_count_today": sales_count_today,
        "sales_count_month": sales_count_month,
        "total_debt_balance": max(total_debt_balance, 0),
        "recent_sales": recent_sales,
    }


@router.get("/low-stock")
async def low_stock_products(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("productos.view")),
):
    result = await db.execute(
        select(Product)
        .where(Product.is_active == True, Product.current_stock <= Product.min_stock)
        .order_by(Product.current_stock.asc())
        .limit(50)
    )
    products = result.scalars().all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "sku": p.sku,
            "current_stock": p.current_stock,
            "min_stock": p.min_stock,
        }
        for p in products
    ]
