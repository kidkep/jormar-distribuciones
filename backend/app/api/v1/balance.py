from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from app.database import get_db
from app.dependencies import require_permission
from app.models.user import User
from app.models.sale import Sale, SaleItem
from app.models.expense import Expense
from app.models.payment import Payment
from app.models.retiro import Retiro
from app.models.product import Product
from app.models.client import Client

router = APIRouter(prefix="/balance", tags=["Balance"])


@router.get("")
async def get_balance(
    fecha_inicio: str = Query("", description="YYYY-MM-DD"),
    fecha_fin: str = Query("", description="YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("reportes.ver")),
):
    now = datetime.now(ZoneInfo("America/Bogota")).replace(tzinfo=None)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)

    if fecha_inicio:
        fi = datetime.strptime(fecha_inicio, "%Y-%m-%d")
    else:
        fi = today.replace(day=1)

    if fecha_fin:
        ff = datetime.strptime(fecha_fin, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
    else:
        ff = now

    # --- VENTAS ---
    ventas_q = await db.execute(
        select(func.coalesce(func.sum(Sale.total), 0)).where(
            Sale.sale_date >= fi, Sale.sale_date <= ff, Sale.status != "anulada"
        )
    )
    total_ventas = float(ventas_q.scalar() or 0)

    ventas_count_q = await db.execute(
        select(func.count()).select_from(Sale).where(
            Sale.sale_date >= fi, Sale.sale_date <= ff, Sale.status != "anulada"
        )
    )
    ventas_count = ventas_count_q.scalar() or 0

    # Ventas por metodo
    methods = ["efectivo", "nequi", "bancolombia", "bogota", "credito"]
    por_metodo = {}
    for m in methods:
        r = await db.execute(
            select(func.coalesce(func.sum(Sale.total), 0)).where(
                Sale.sale_date >= fi, Sale.sale_date <= ff,
                Sale.status != "anulada", Sale.payment_method == m
            )
        )
        por_metodo[m] = float(r.scalar() or 0)

    # --- VENTAS POR DIA (serie temporal dentro del periodo) ---
    ventas_dia_q = await db.execute(
        select(
            func.date(Sale.sale_date).label("dia"),
            func.coalesce(func.sum(Sale.total), 0),
        )
        .where(Sale.sale_date >= fi, Sale.sale_date <= ff, Sale.status != "anulada")
        .group_by(func.date(Sale.sale_date))
        .order_by(func.date(Sale.sale_date))
    )
    ventas_dia_map = {str(row[0]): float(row[1]) for row in ventas_dia_q.all()}
    ventas_por_dia = []
    cur = fi
    while cur <= ff:
        key = cur.strftime("%Y-%m-%d")
        ventas_por_dia.append({"fecha": key, "total": ventas_dia_map.get(key, 0.0)})
        cur = cur + timedelta(days=1)

    # --- GASTOS ---
    gastos_q = await db.execute(
        select(func.coalesce(func.sum(Expense.amount), 0)).where(
            Expense.expense_date >= fi, Expense.expense_date <= ff
        )
    )
    total_gastos = float(gastos_q.scalar() or 0)

    gastos_count_q = await db.execute(
        select(func.count()).select_from(Expense).where(
            Expense.expense_date >= fi, Expense.expense_date <= ff
        )
    )
    gastos_count = gastos_count_q.scalar() or 0

    # Gastos por categoria
    gastos_cat_q = await db.execute(
        select(Expense.category, func.coalesce(func.sum(Expense.amount), 0))
        .where(Expense.expense_date >= fi, Expense.expense_date <= ff)
        .group_by(Expense.category)
    )
    gastos_por_categoria = {row[0]: float(row[1]) for row in gastos_cat_q.all()}

    # --- ABONOS ---
    abonos_q = await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(
            Payment.payment_date >= fi, Payment.payment_date <= ff
        )
    )
    total_abonos = float(abonos_q.scalar() or 0)

    # --- ABONOS POR METODO (todo el historial) ---
    abonos_por_metodo = {}
    for m in methods:
        if m == "credito":
            abonos_por_metodo[m] = 0.0
            continue
        r = await db.execute(
            select(func.coalesce(func.sum(Payment.amount), 0)).where(Payment.payment_method == m)
        )
        abonos_por_metodo[m] = float(r.scalar() or 0)

    # --- SALDO REAL POR METODO (historial completo) ---
    # Ventas totales por metodo (historial completo)
    total_ventas_por_metodo = {}
    for m in methods:
        r = await db.execute(
            select(func.coalesce(func.sum(Sale.total), 0)).where(
                Sale.status != "anulada", Sale.payment_method == m
            )
        )
        total_ventas_por_metodo[m] = float(r.scalar() or 0)

    # Gastos por metodo (historial completo)
    gastos_hist_por_metodo = {}
    for m in methods:
        r = await db.execute(
            select(func.coalesce(func.sum(Expense.amount), 0)).where(Expense.payment_method == m)
        )
        gastos_hist_por_metodo[m] = float(r.scalar() or 0)

    # Retiros por metodo (historial completo)
    retiros_q = await db.execute(
        select(Retiro.source_method, func.coalesce(func.sum(Retiro.amount), 0)).group_by(Retiro.source_method)
    )
    retiros_hist_por_metodo = {row[0]: float(row[1]) for row in retiros_q.all()}

    # Total abonos historial
    total_abonos_hist_q = await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0))
    )
    total_abonos_hist = float(total_abonos_hist_q.scalar() or 0)

    # --- DEUDA PENDIENTE ---
    deuda_total_q = await db.execute(
        select(func.coalesce(func.sum(Sale.total), 0)).where(
            Sale.payment_method == "credito", Sale.status != "anulada"
        )
    )
    deuda_total = float(deuda_total_q.scalar() or 0)

    pagos_total_q = await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0))
    )
    pagos_total = float(pagos_total_q.scalar() or 0)
    deuda_pendiente = max(deuda_total - pagos_total, 0)

    # Calcular saldo real por metodo
    # Credito: NO cuenta como dinero en caja (es dinero fiado, no ha entrado real).
    #          Solo se muestra como referencia lo fiado pendiente, pero NO se suma
    #          al dinero disponible. El dinero real del credito entra solo cuando el
    #          cliente abona, y ese abono ya se contabiliza en el metodo donde se recibio.
    saldo_por_metodo = {}
    for m in methods:
        gastos_m = gastos_hist_por_metodo.get(m, 0)
        retiros_m = retiros_hist_por_metodo.get(m, 0)
        if m == "credito":
            saldo_por_metodo[m] = deuda_pendiente
        else:
            vendido = total_ventas_por_metodo.get(m, 0)
            abonos_m = abonos_por_metodo.get(m, 0)
            saldo_por_metodo[m] = vendido + abonos_m - gastos_m - retiros_m

    # --- PRODUCTOS / INVENTARIO ---
    inv_q = await db.execute(
        select(func.coalesce(func.sum(Product.current_stock * Product.purchase_price), 0))
        .where(Product.is_active == True)
    )
    valor_inventario = float(inv_q.scalar() or 0)

    inv_venta_q = await db.execute(
        select(func.coalesce(func.sum(Product.current_stock * Product.sale_price), 0))
        .where(Product.is_active == True)
    )
    valor_inventario_venta = float(inv_venta_q.scalar() or 0)

    productos_count_q = await db.execute(
        select(func.count()).select_from(Product).where(Product.is_active == True)
    )
    productos_count = productos_count_q.scalar() or 0

    bajo_stock_q = await db.execute(
        select(func.count()).select_from(Product).where(
            Product.is_active == True, Product.current_stock <= Product.min_stock
        )
    )
    bajo_stock = bajo_stock_q.scalar() or 0

    # --- CLIENTES ---
    clientes_count_q = await db.execute(
        select(func.count()).select_from(Client).where(Client.is_active == True)
    )
    clientes_count = clientes_count_q.scalar() or 0

    # --- TOP 5 PRODUCTOS MAS VENDIDOS ---
    top_products_q = await db.execute(
        select(
            SaleItem.product_id,
            func.sum(SaleItem.quantity).label("total_vendido"),
            func.sum(SaleItem.total_price).label("total_generado"),
        )
        .join(Sale, Sale.id == SaleItem.sale_id)
        .where(Sale.sale_date >= fi, Sale.sale_date <= ff, Sale.status != "anulada")
        .group_by(SaleItem.product_id)
        .order_by(func.sum(SaleItem.quantity).desc())
        .limit(5)
    )
    top_products = []
    for row in top_products_q.all():
        prod_q = await db.execute(select(Product).where(Product.id == row[0]))
        prod = prod_q.scalar_one_or_none()
        top_products.append({
            "producto": prod.name if prod else f"#{row[0]}",
            "unidades_vendidas": row[1],
            "total_generado": float(row[2]),
        })

    # --- GANANCIA ---
    ganancia_bruta = total_ventas - total_gastos

    # --- DEUDORES DETALLE ---
    deudores_q = await db.execute(
        select(Sale)
        .options(
            selectinload(Sale.client),
            selectinload(Sale.items).selectinload(SaleItem.product),
            selectinload(Sale.payments),
        )
        .where(Sale.payment_method == "credito", Sale.status != "anulada")
        .order_by(Sale.created_at.desc())
    )
    deudores_raw = deudores_q.unique().scalars().all()

    deudores = []
    for sale in deudores_raw:
        total_paid = sum(float(p.amount) for p in sale.payments)
        balance = float(sale.total) - total_paid
        if balance <= 0:
            continue
        deudores.append({
            "sale_id": sale.id,
            "invoice_number": sale.invoice_number,
            "sale_date": sale.sale_date.strftime("%Y-%m-%d") if sale.sale_date else "",
            "client_name": sale.client_name or (sale.client.name if sale.client else "Sin cliente"),
            "client_doc": sale.client.document_number if sale.client else "",
            "client_phone": sale.client.phone if sale.client else "",
            "total": float(sale.total),
            "total_paid": total_paid,
            "balance": balance,
            "items": [
                {"producto": it.product.name if it.product else f"#{it.product_id}", "cantidad": it.quantity, "precio": float(it.unit_price)}
                for it in sale.items
            ],
            "pagos": [
                {"monto": float(p.amount), "fecha": p.payment_date.strftime("%Y-%m-%d") if p.payment_date else "", "metodo": p.payment_method}
                for p in sale.payments
            ],
        })

    total_deudores = len(deudores)
    total_deuda_clientes = sum(d["balance"] for d in deudores)

    return {
        "periodo": {"inicio": fi.strftime("%Y-%m-%d"), "fin": ff.strftime("%Y-%m-%d")},
        "ventas": {
            "total": total_ventas,
            "cantidad": ventas_count,
            "ticket_promedio": total_ventas / ventas_count if ventas_count > 0 else 0,
            "por_metodo": por_metodo,
            "por_dia": ventas_por_dia,
        },
        "gastos": {
            "total": total_gastos,
            "cantidad": gastos_count,
            "por_categoria": gastos_por_categoria,
        },
        "abonos": {"total": total_abonos, "por_metodo": abonos_por_metodo},
        "deuda": {"pendiente": deuda_pendiente},
        "saldo_por_metodo": saldo_por_metodo,
        "deudores": {
            "cantidad": total_deudores,
            "total_pendiente": total_deuda_clientes,
            "lista": deudores,
        },
        "inventario": {
            "valor_compra": valor_inventario,
            "valor_venta": valor_inventario_venta,
            "total_productos": productos_count,
            "bajo_stock": bajo_stock,
        },
        "clientes": {"total": clientes_count},
        "top_productos": top_products,
        "ganancia": {
            "bruta": ganancia_bruta,
            "margen": (ganancia_bruta / total_ventas * 100) if total_ventas > 0 else 0,
        },
    }
