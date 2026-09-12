from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import AJUSTE_INVERSION
from app.models.sale import Sale, SaleItem
from app.models.payment import Payment
from app.models.expense import Expense
from app.models.retiro import Retiro
from app.models.product import Product
from app.models.client import Client
from app.models.prestamo import Prestamo, PrestamoPago
from app.models.colchon import ColchonConfig, ColchonPago, ColchonPrestamo

METHODS = ["efectivo", "nequi", "bancolombia", "bogota", "credito"]

METHOD_LABELS = {
    "efectivo": "Efectivo",
    "nequi": "Nequi",
    "bancolombia": "Bancolombia",
    "bogota": "Banco de Bogota",
    "credito": "Cartera (por cobrar)",
}

CATEGORY_LABELS = {
    "general": "General",
    "arriendo": "Arriendo",
    "servicios": "Servicios",
    "nomina": "Nomina",
    "transporte": "Transporte",
    "material": "Material",
    "impuestos": "Impuestos",
    "marketing": "Marketing",
    "mantenimiento": "Mantenimiento",
    "otro": "Otro",
}


def _f(value) -> float:
    return float(value or 0)


def _pct(parte, total) -> float:
    return (_f(parte) / _f(total) * 100) if _f(total) > 0 else 0


def _format_money(value: float) -> str:
    return f"${_f(value):,.0f}"


def _format_number(value) -> str:
    if value == int(value):
        return f"{int(value):,}"
    return f"{_f(value):,.1f}"


def _buckets_antiguedad(hoy):
    return {
        "0-30": hoy - timedelta(days=30),
        "31-60": hoy - timedelta(days=60),
        "61-90": hoy - timedelta(days=90),
        "91+": hoy - timedelta(days=9999),
    }


async def _periodo_parametros(fecha_inicio: str, fecha_fin: str):
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

    duracion = (ff.replace(hour=0, minute=0, second=0, microsecond=0) - fi).days + 1
    fi_anterior = fi - timedelta(days=duracion)
    ff_anterior = fi - timedelta(seconds=1)
    return fi, ff, fi_anterior, ff_anterior, duracion, now, today


async def build_analytics(db: AsyncSession, fecha_inicio: str = "", fecha_fin: str = "") -> dict:
    fi, ff, fi_anterior, ff_anterior, duracion, now, today = await _periodo_parametros(fecha_inicio, fecha_fin)

    # ---- VENTAS DEL PERIODO (todo lo facturado, sin anuladas) ----
    facturado_q = await db.execute(
        select(func.coalesce(func.sum(Sale.total), 0)).where(
            Sale.sale_date >= fi, Sale.sale_date <= ff, Sale.status != "anulada"
        )
    )
    facturado = _f(facturado_q.scalar())

    contado_q = await db.execute(
        select(func.coalesce(func.sum(Sale.total), 0)).where(
            Sale.sale_date >= fi, Sale.sale_date <= ff, Sale.status != "anulada",
            Sale.payment_method != "credito"
        )
    )
    contado = _f(contado_q.scalar())

    credito_q = await db.execute(
        select(func.coalesce(func.sum(Sale.total), 0)).where(
            Sale.sale_date >= fi, Sale.sale_date <= ff, Sale.status != "anulada",
            Sale.payment_method == "credito"
        )
    )
    credito_vendido = _f(credito_q.scalar())

    count_q = await db.execute(
        select(func.count()).select_from(Sale).where(
            Sale.sale_date >= fi, Sale.sale_date <= ff, Sale.status != "anulada"
        )
    )
    cantidad = count_q.scalar() or 0

    abonos_q = await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(
            Payment.payment_date >= fi, Payment.payment_date <= ff
        )
    )
    abonos = _f(abonos_q.scalar())

    recibido_real = contado + abonos

    # Por metodo (contado + abonos del periodo)
    por_metodo = {}
    for m in METHODS:
        if m == "credito":
            por_metodo[m] = _f(credito_vendido)
            continue
        r = await db.execute(
            select(func.coalesce(func.sum(Sale.total), 0)).where(
                Sale.sale_date >= fi, Sale.sale_date <= ff,
                Sale.status != "anulada", Sale.payment_method == m
            )
        )
        a = await db.execute(
            select(func.coalesce(func.sum(Payment.amount), 0)).where(
                Payment.payment_date >= fi, Payment.payment_date <= ff,
                Payment.payment_method == m
            )
        )
        por_metodo[m] = _f(r.scalar()) + _f(a.scalar())

    # ---- PERIODO ANTERIOR (comparativo) ----
    facturado_ant_q = await db.execute(
        select(func.coalesce(func.sum(Sale.total), 0)).where(
            Sale.sale_date >= fi_anterior, Sale.sale_date <= ff_anterior, Sale.status != "anulada"
        )
    )
    facturado_anterior = _f(facturado_ant_q.scalar())

    contado_ant_q = await db.execute(
        select(func.coalesce(func.sum(Sale.total), 0)).where(
            Sale.sale_date >= fi_anterior, Sale.sale_date <= ff_anterior, Sale.status != "anulada",
            Sale.payment_method != "credito"
        )
    )
    contado_anterior = _f(contado_ant_q.scalar())

    abonos_ant_q = await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(
            Payment.payment_date >= fi_anterior, Payment.payment_date <= ff_anterior
        )
    )
    abonos_anterior = _f(abonos_ant_q.scalar())
    recibido_anterior = contado_anterior + abonos_anterior

    # ---- GASTOS ----
    gastos_q = await db.execute(
        select(func.coalesce(func.sum(Expense.amount), 0)).where(
            Expense.expense_date >= fi, Expense.expense_date <= ff
        )
    )
    total_gastos = _f(gastos_q.scalar())

    gastos_count_q = await db.execute(
        select(func.count()).select_from(Expense).where(
            Expense.expense_date >= fi, Expense.expense_date <= ff
        )
    )
    gastos_count = gastos_count_q.scalar() or 0

    gastos_cat_q = await db.execute(
        select(Expense.category, func.coalesce(func.sum(Expense.amount), 0))
        .where(Expense.expense_date >= fi, Expense.expense_date <= ff)
        .group_by(Expense.category)
    )
    gastos_por_categoria = {row[0]: _f(row[1]) for row in gastos_cat_q.all()}

    gastos_ant_q = await db.execute(
        select(func.coalesce(func.sum(Expense.amount), 0)).where(
            Expense.expense_date >= fi_anterior, Expense.expense_date <= ff_anterior
        )
    )
    gastos_anterior = _f(gastos_ant_q.scalar())

    # Retiros del periodo (saques de dinero del negocio)
    retiros_q = await db.execute(
        select(func.coalesce(func.sum(Retiro.amount), 0)).where(
            Retiro.retiro_date >= fi, Retiro.retiro_date <= ff
        )
    )
    retiros_periodo = _f(retiros_q.scalar())

    # ---- COSTO DE MERCADERIA Y RENTABILIDAD ----
    costo_mercancia = 0.0
    costo_rows = await db.execute(
        select(
            SaleItem.product_id,
            func.sum(SaleItem.quantity).label("qty"),
        )
        .join(Sale, Sale.id == SaleItem.sale_id)
        .where(Sale.sale_date >= fi, Sale.sale_date <= ff, Sale.status != "anulada")
        .group_by(SaleItem.product_id)
    )
    prod_map = {}
    for row in costo_rows.all():
        pid = row[0]
        qty = _f(row[1])
        if pid not in prod_map:
            pq = await db.execute(select(Product.purchase_price).where(Product.id == pid))
            prod_map[pid] = _f(pq.scalar() or 0)
        costo_mercancia += prod_map[pid] * qty

    utilidad_comercial = facturado - costo_mercancia - total_gastos
    ganancia_caja = recibido_real - total_gastos

    # ---- TOP 5 PRODUCTOS (unidades, generado, costo y utilidad) ----
    top_q = await db.execute(
        select(
            SaleItem.product_id,
            func.sum(SaleItem.quantity).label("unid"),
            func.sum(SaleItem.total_price).label("gen"),
        )
        .join(Sale, Sale.id == SaleItem.sale_id)
        .where(Sale.sale_date >= fi, Sale.sale_date <= ff, Sale.status != "anulada")
        .group_by(SaleItem.product_id)
        .order_by(func.sum(SaleItem.quantity).desc())
        .limit(5)
    )
    top_productos = []
    for row in top_q.all():
        pid = row[0]
        pq = await db.execute(select(Product).where(Product.id == pid))
        prod = pq.scalar_one_or_none()
        nombre = prod.name if prod else f"Producto #{pid}"
        costo_u = _f(prod.purchase_price) if prod else 0
        total_vendido = _f(row[1])
        generado = _f(row[2])
        costo = costo_u * total_vendido
        top_productos.append({
            "producto": nombre,
            "unidades": total_vendido,
            "generado": generado,
            "costo": costo,
            "utilidad": generado - costo,
        })

    # ---- SALDO POR METODO (historial completo, igual logica de balance) ----
    total_ventas_por_metodo = {}
    gastos_hist_por_metodo = {}
    for m in METHODS:
        r = await db.execute(
            select(func.coalesce(func.sum(Sale.total), 0)).where(
                Sale.status != "anulada", Sale.payment_method == m
            )
        )
        total_ventas_por_metodo[m] = _f(r.scalar())
        g = await db.execute(
            select(func.coalesce(func.sum(Expense.amount), 0)).where(Expense.payment_method == m)
        )
        gastos_hist_por_metodo[m] = _f(g.scalar())

    abonos_por_metodo = {}
    for m in METHODS:
        if m == "credito":
            abonos_por_metodo[m] = 0.0
            continue
        r = await db.execute(
            select(func.coalesce(func.sum(Payment.amount), 0)).where(Payment.payment_method == m)
        )
        abonos_por_metodo[m] = _f(r.scalar())

    retiros_hist_q = await db.execute(
        select(Retiro.source_method, func.coalesce(func.sum(Retiro.amount), 0)).group_by(Retiro.source_method)
    )
    retiros_hist = {row[0]: _f(row[1]) for row in retiros_hist_q.all()}

    prestamos_out = {}
    prestamos_in = {}
    colchon_out = {}
    for m in METHODS:
        if m == "credito":
            prestamos_out[m] = 0.0
            prestamos_in[m] = 0.0
            colchon_out[m] = 0.0
            continue
        po = await db.execute(
            select(func.coalesce(func.sum(Prestamo.amount), 0)).where(
                Prestamo.payment_method == m, Prestamo.status != "cancelado"
            )
        )
        prestamos_out[m] = _f(po.scalar())
        pi = await db.execute(
            select(func.coalesce(func.sum(PrestamoPago.amount), 0))
            .join(Prestamo, PrestamoPago.prestamo_id == Prestamo.id)
            .where(PrestamoPago.payment_method == m)
        )
        prestamos_in[m] = _f(pi.scalar())
        co = await db.execute(
            select(func.coalesce(func.sum(ColchonPago.amount), 0)).where(ColchonPago.payment_method == m)
        )
        colchon_out[m] = _f(co.scalar())

    deuda_total_q = await db.execute(
        select(func.coalesce(func.sum(Sale.total), 0)).where(
            Sale.payment_method == "credito", Sale.status != "anulada"
        )
    )
    deuda_total = _f(deuda_total_q.scalar())
    pagos_total_q = await db.execute(select(func.coalesce(func.sum(Payment.amount), 0)))
    pagos_total = _f(pagos_total_q.scalar())
    deuda_pendiente = max(deuda_total - pagos_total, 0)

    saldo_por_metodo = {}
    for m in METHODS:
        if m == "credito":
            saldo_por_metodo[m] = deuda_pendiente
            continue
        saldo_por_metodo[m] = (
            total_ventas_por_metodo.get(m, 0)
            + abonos_por_metodo.get(m, 0)
            + prestamos_in.get(m, 0)
            - gastos_hist_por_metodo.get(m, 0)
            - prestamos_out.get(m, 0)
            - colchon_out.get(m, 0)
        )
    saldo_por_metodo["efectivo"] += AJUSTE_INVERSION

    # ---- CARTERA / DEUDORES ----
    deudores_q = await db.execute(
        select(Sale)
        .options(
            selectinload(Sale.client),
            selectinload(Sale.payments),
        )
        .where(Sale.payment_method == "credito", Sale.status != "anulada")
        .order_by(Sale.sale_date.asc())
    )
    deudores_raw = deudores_q.unique().scalars().all()
    deudores = []
    antiguedad = {"0-30": 0.0, "31-60": 0.0, "61-90": 0.0, "91+": 0.0}
    antiguedad_count = {"0-30": 0, "31-60": 0, "61-90": 0, "91+": 0}

    for sale in deudores_raw:
        pagado = sum(_f(p.amount) for p in sale.payments)
        balance = _f(sale.total) - pagado
        if balance <= 0:
            continue
        dias = (today - sale.sale_date).days if sale.sale_date else 0
        if dias <= 30:
            bucket = "0-30"
        elif dias <= 60:
            bucket = "31-60"
        elif dias <= 90:
            bucket = "61-90"
        else:
            bucket = "91+"
        antiguedad[bucket] += balance
        antiguedad_count[bucket] += 1
        deudores.append({
            "cliente": sale.client_name or (sale.client.name if sale.client else "Sin cliente"),
            "remision": sale.invoice_number,
            "fecha": sale.sale_date.strftime("%d/%m/%Y") if sale.sale_date else "",
            "dias": dias,
            "vendido": _f(sale.total),
            "pagado": pagado,
            "saldo": balance,
        })

    deuda_pendiente_calculada = sum(d["saldo"] for d in deudores)
    deudores_count = len(deudores)

    # ---- INVENTARIO ----
    inv_costo_q = await db.execute(
        select(func.coalesce(func.sum(Product.current_stock * Product.purchase_price), 0)).where(Product.is_active == True)
    )
    inventario_costo = _f(inv_costo_q.scalar())
    inv_venta_q = await db.execute(
        select(func.coalesce(func.sum(Product.current_stock * Product.sale_price), 0)).where(Product.is_active == True)
    )
    inventario_venta = _f(inv_venta_q.scalar())

    productos_count_q = await db.execute(select(func.count()).select_from(Product).where(Product.is_active == True))
    productos_count = productos_count_q.scalar() or 0

    bajo_stock_q = await db.execute(
        select(func.count()).select_from(Product).where(
            Product.is_active == True, Product.current_stock <= Product.min_stock
        )
    )
    bajo_stock = bajo_stock_q.scalar() or 0

    agotados_q = await db.execute(
        select(func.count()).select_from(Product).where(
            Product.is_active == True, Product.current_stock <= 0
        )
    )
    agotados = agotados_q.scalar() or 0

    sin_margen_q = await db.execute(
        select(func.count()).select_from(Product).where(
            Product.is_active == True, Product.purchase_price >= Product.sale_price, Product.sale_price > 0
        )
    )
    sin_margen = sin_margen_q.scalar() or 0

    # ---- CLIENTES ----
    clientes_count_q = await db.execute(select(func.count()).select_from(Client).where(Client.is_active == True))
    clientes_count = clientes_count_q.scalar() or 0

    # ---- PRESTAMOS Y COLCHON ----
    prestamos_act_q = await db.execute(select(func.coalesce(func.sum(Prestamo.remaining), 0)).where(Prestamo.status == "activo"))
    prestamos_pendiente = _f(prestamos_act_q.scalar())
    prestamos_act_count_q = await db.execute(select(func.count()).select_from(Prestamo).where(Prestamo.status == "activo"))
    prestamos_act_count = prestamos_act_count_q.scalar() or 0

    prestamos_abonos_q = await db.execute(select(func.coalesce(func.sum(PrestamoPago.amount), 0)))
    prestamos_abonos = _f(prestamos_abonos_q.scalar())

    colchon_config_q = await db.execute(select(ColchonConfig.monto_base).limit(1))
    colchon_base = _f((colchon_config_q.scalar() or 0))
    colchon_abonos_q = await db.execute(select(func.coalesce(func.sum(ColchonPago.amount), 0)))
    colchon_abonos = _f(colchon_abonos_q.scalar())
    colchon_pend_q = await db.execute(select(func.coalesce(func.sum(ColchonPrestamo.remaining), 0)).where(ColchonPrestamo.status == "activo"))
    colchon_pendiente = _f(colchon_pend_q.scalar())

    # ---- COMPARATIVO ----
    crecimiento_facturado = _pct(facturado - facturado_anterior, facturado_anterior) if facturado_anterior > 0 else (100.0 if facturado > 0 else 0.0)
    crecimiento_recibido = _pct(recibido_real - recibido_anterior, recibido_anterior) if recibido_anterior > 0 else (100.0 if recibido_real > 0 else 0.0)
    crecimiento_gastos = _pct(total_gastos - gastos_anterior, gastos_anterior) if gastos_anterior > 0 else (100.0 if total_gastos > 0 else 0.0)

    # ---- ANALISIS: FORTALEZAS Y ALERTAS ----
    fortalezas, alertas = _analisis(
        facturado=facturado,
        recibido_real=recibido_real,
        total_gastos=total_gastos,
        crecimiento_facturado=crecimiento_facturado,
        crecimiento_recibido=crecimiento_recibido,
        ganancia_caja=ganancia_caja,
        utilidad_comercial=utilidad_comercial,
        deuda_pendiente=deuda_pendiente_calculada,
        deudores_count=deudores_count,
        antiguedad=antiguedad,
        antiguedad_count=antiguedad_count,
        inventario_costo=inventario_costo,
        inventario_venta=inventario_venta,
        bajo_stock=bajo_stock,
        agotados=agotados,
        sin_margen=sin_margen,
        saldo_por_metodo=saldo_por_metodo,
        prestamos_pendiente=prestamos_pendiente,
        prestamos_act_count=prestamos_act_count,
        colchon_pendiente=colchon_pendiente,
        colchon_abonos=colchon_abonos,
        colchon_base=colchon_base,
        clientes_count=clientes_count,
        cantidad=cantidad,
        top_productos=top_productos,
        hoy=today,
    )

    # ---- PROYECCION A PROXIMOS MESES ----
    promedio_diario = ((recibido_real / duracion) if duracion > 0 else 0)
    promedio_diario_ant = ((recibido_anterior / duracion) if duracion > 0 else 0)
    tendencia_ventas = _pct(promedio_diario - promedio_diario_ant, promedio_diario_ant) if promedio_diario_ant > 0 else 0.0
    gasto_mensual_proyectado = (total_gastos / duracion) * 30 if duracion > 0 else 0

    escenarios = {
        "pesimista": {
            "ventas_mes": promedio_diario * 30 * (1 + (tendencia_ventas - 10) / 100),
            "crecimiento": tendencia_ventas - 10,
        },
        "realista": {
            "ventas_mes": promedio_diario * 30 * (1 + tendencia_ventas / 100),
            "crecimiento": tendencia_ventas,
        },
        "optimista": {
            "ventas_mes": promedio_diario * 30 * (1 + (tendencia_ventas + 10) / 100),
            "crecimiento": tendencia_ventas + 10,
        },
    }
    for key, esc in escenarios.items():
        esc["utilidad_mes"] = esc["ventas_mes"] - gasto_mensual_proyectado
        esc["meses_proyeccion"] = 3
        esc["ventas_3m"] = esc["ventas_mes"] * 3

    proyeccion = {
        "periodo_dias": duracion,
        "promedio_diario": promedio_diario,
        "tendencia": tendencia_ventas,
        "gastos_mensuales": gasto_mensual_proyectado,
        "escenarios": escenarios,
        "resumen": _texto_proyeccion(escenarios, gasto_mensual_proyectado, promedio_diario, tendencia_ventas),
        "recomendaciones": _recomendaciones(alertas),
    }

    # ---- RESUMEN NARRATIVO ----
    veredicto, salud = _veredicto(ganancia_caja, utilidad_comercial, alertas)
    resumen = (
        f"Durante el periodo del {fi.strftime('%d/%m/%Y')} al {ff.strftime('%d/%m/%Y')} "
        f"({duracion} dias), JORMAR DISTRIBUCIONES facturo {_format_money(facturado)} "
        f"en {cantidad:,} ventas, de las cuales {_format_money(contado)} fueron de contado y "
        f"{_format_money(credito_vendido)} a credito. El dinero real recibido (contado + abonos) fue de "
        f"{_format_money(recibido_real)}. Los gastos del periodo sumaron {_format_money(total_gastos)} "
        f"({gastos_count:,} registros), lo que deja una ganancia de caja de {_format_money(ganancia_caja)} "
        f"y una utilidad comercial estimada (descontando el costo de la mercancia) de "
        f"{_format_money(utilidad_comercial)}. {veredicto}"
    )

    return {
        "generado": now.strftime("%d/%m/%Y %H:%M"),
        "periodo": {
            "inicio": fi.strftime("%Y-%m-%d"),
            "fin": ff.strftime("%Y-%m-%d"),
            "inicio_legible": fi.strftime("%d/%m/%Y"),
            "fin_legible": ff.strftime("%d/%m/%Y"),
            "dias": duracion,
            "promedio_diario": promedio_diario,
        },
        "resumen": resumen,
        "salud": salud,
        "ventas": {
            "facturado": facturado,
            "contado": contado,
            "credito_vendido": credito_vendido,
            "cantidad": cantidad,
            "ticket_promedio": facturado / cantidad if cantidad else 0,
            "por_metodo": por_metodo,
            "top_productos": top_productos,
            "recibido_real": recibido_real,
            "abonos": abonos,
        },
        "gastos": {
            "total": total_gastos,
            "cantidad": gastos_count,
            "por_categoria": gastos_por_categoria,
            "retiros": retiros_periodo,
        },
        "comparativo": {
            "previo": {"inicio": fi_anterior.strftime("%d/%m/%Y"), "fin": ff_anterior.strftime("%d/%m/%Y")},
            "facturado_anterior": facturado_anterior,
            "recibido_anterior": recibido_anterior,
            "gastos_anterior": gastos_anterior,
            "crecimiento_facturado": crecimiento_facturado,
            "crecimiento_recibido": crecimiento_recibido,
            "crecimiento_gastos": crecimiento_gastos,
        },
        "rentabilidad": {
            "costo_mercancia": costo_mercancia,
            "utilidad_comercial": utilidad_comercial,
            "margen_comercial": _pct(utilidad_comercial, facturado),
            "ganancia_caja": ganancia_caja,
            "margen_caja": _pct(ganancia_caja, recibido_real),
        },
        "caja": {
            "saldo_por_metodo": saldo_por_metodo,
            "abonos_por_metodo": abonos_por_metodo,
        },
        "cartera": {
            "deuda_total": deuda_total,
            "abonos_total": pagos_total,
            "deuda_pendiente": deuda_pendiente_calculada,
            "deudores_count": deudores_count,
            "antiguedad": antiguedad,
            "antiguedad_count": antiguedad_count,
            "deudores": deudores,
        },
        "inventario": {
            "costo": inventario_costo,
            "venta": inventario_venta,
            "utilidad_potencial": inventario_venta - inventario_costo,
            "total_productos": productos_count,
            "bajo_stock": bajo_stock,
            "agotados": agotados,
            "sin_margen": sin_margen,
        },
        "clientes": {"total": clientes_count},
        "prestamos": {
            "pendiente": prestamos_pendiente,
            "activos": prestamos_act_count,
            "abonos": prestamos_abonos,
        },
        "colchon": {
            "base": colchon_base,
            "ahorrado": colchon_abonos,
            "pendiente_cobrar": colchon_pendiente,
        },
        "fortalezas": fortalezas,
        "alertas": alertas,
        "proyeccion": proyeccion,
    }


def _analisis(**ctx) -> tuple[list[dict], list[dict]]:
    fortalezas = []
    alertas = []

    # Crecimiento
    if ctx["crecimiento_facturado"] >= 5:
        fortalezas.append({
            "titulo": "Ventas en crecimiento",
            "detalle": (
                f"El facturado subio un {_format_number(ctx['crecimiento_facturado'])}% frente al periodo anterior. "
                "La demanda tiene buena salud y justifica reponer stock de los productos mas vendidos."
            ),
        })
    else:
        alertas.append({
            "severidad": "MEDIA",
            "titulo": "Ventas estancadas o en caida",
            "detalle": (
                f"El facturado vario {_format_number(ctx['crecimiento_facturado'])}% frente al periodo anterior. "
                "Conviene revisar precios, promocionar los productos top y reactivar la cartera de clientes."
            ),
        })

    # Utilidad
    if ctx["ganancia_caja"] > 0 and ctx["utilidad_comercial"] > 0:
        fortalezas.append({
            "titulo": "Negocio rentable",
            "detalle": (
                f"Genera ganancia de caja por {_format_money(ctx['ganancia_caja'])} y una utilidad comercial "
                f"estimada de {_format_money(ctx['utilidad_comercial'])} despues de cubrir el costo de la mercancia vendida."
            ),
        })
    else:
        alertas.append({
            "severidad": "CRITICA",
            "titulo": "Resultado negativo o en cero",
            "detalle": (
                f"La ganancia de caja es de {_format_money(ctx['ganancia_caja'])} y la utilidad comercial estimada de "
                f"{_format_money(ctx['utilidad_comercial'])}. Los egresos igualan o superan los ingresos: hay que recortar gastos "
                "o impulsar ventas de inmediato."
            ),
        })

    # Proporcion gastos / ingresos
    if ctx["recibido_real"] > 0:
        proporcion = _pct(ctx["total_gastos"], ctx["recibido_real"])
        if proporcion <= 40:
            fortalezas.append({
                "titulo": "Gastos controlados",
                "detalle": f"Los gastos representan solo el {_format_number(proporcion)}% del dinero recibido, una estructura de costos sana.",
            })
        elif proporcion > 70:
            alertas.append({
                "severidad": "ALTA",
                "titulo": "Gastos muy altos",
                "detalle": f"Los gastos consumen el {_format_number(proporcion)}% de lo que ingresa. Queda poco margen para inversion y utilidad.",
            })

    # Cartera vencida
    if ctx["deuda_pendiente"] > 0:
        if ctx["antiguedad"]["91+"] > 0 or ctx["antiguedad"]["61-90"] > 0:
            total_vencido = ctx["antiguedad"]["61-90"] + ctx["antiguedad"]["91+"]
            casos = ctx["antiguedad_count"]["61-90"] + ctx["antiguedad_count"]["91+"]
            alertas.append({
                "severidad": "CRITICA",
                "titulo": "Cartera vencida sin cobrar",
                "detalle": (
                    f"Hay {_format_money(total_vencido)} en creditos de mas de 60 dias ({casos} deudores). "
                    "El riesgo de no recuperar este dinero crece con los dias: priorice el cobro."
                ),
            })
        por_cobrar = _pct(ctx["deuda_pendiente"], ctx["facturado"])
        alertas.append({
            "severidad": "MEDIA",
            "titulo": "Dinero fiado por cobrar",
            "detalle": (
                f"Hay {ctx['deudores_count']} deudores con {_format_money(ctx['deuda_pendiente'])} pendiente "
                f"({_format_number(por_cobrar)}% del facturado del periodo). Defina plazos y exija abonos."
            ),
        })
    else:
        fortalezas.append({
            "titulo": "Sin deuda pendiente",
            "detalle": "Todos los creditos estan al dia o pagados. La cartera no representa riesgo.",
        })

    # Inventario
    if ctx["bajo_stock"] > 0:
        alertas.append({
            "severidad": "ALTA" if ctx["agotados"] > 0 else "MEDIA",
            "titulo": "Productos con stock critico",
            "detalle": (
                f"{ctx['bajo_stock']} productos estan en o por debajo de su stock minimo, "
                f"{ctx['agotados']} de ellos agotados. Revise las solicitudes de pedido pendientes."
            ),
        })
    else:
        fortalezas.append({
            "titulo": "Inventario bien surtido",
            "detalle": "Todos los productos se mantienen por encima de su stock minimo.",
        })

    if ctx["sin_margen"] > 0:
        alertas.append({
            "severidad": "MEDIA",
            "titulo": "Productos sin margen",
            "detalle": (
                f"{ctx['sin_margen']} productos tienen un precio de venta igual o menor a su costo. "
                "Venderlos no genera retorno y puede generar perdida."
            ),
        })

    if ctx["inventario_costo"] > 0:
        utilidad_potencial = ctx["inventario_venta"] - ctx["inventario_costo"]
        fortalezas.append({
            "titulo": "Capital invertido en mercancia",
            "detalle": (
                f"El inventario representa {_format_money(ctx['inventario_costo'])} a costo de compra y "
                f"{_format_money(ctx['inventario_venta'])} a precio de venta, con {_format_money(utilidad_potencial)} "
                "de utilidad potencial si se vende al precio actual."
            ),
        })

    # Liquidez por metodo
    for metodo, saldo in ctx["saldo_por_metodo"].items():
        if metodo == "credito":
            continue
        if saldo < 0:
            alertas.append({
                "severidad": "ALTA",
                "titulo": f"Saldo negativo en {METHOD_LABELS.get(metodo, metodo)}",
                "detalle": f"El saldo de {METHOD_LABELS.get(metodo, metodo)} esta en {_format_money(saldo)}. Revise gastos o retiros registrados en ese medio.",
            })

    total_disp = sum(s for k, s in ctx["saldo_por_metodo"].items() if k != "credito")
    if total_disp > 0:
        if ctx["prestamos_pendiente"] > 0:
            alertas.append({
                "severidad": "MEDIA",
                "titulo": "Prestamos internos sin pagar",
                "detalle": (
                    f"Quedan {_format_money(ctx['prestamos_pendiente'])} por cobrar en {ctx['prestamos_act_count']} "
                    "prestamos internos activos. Gestionar su recuperacion libera dinero al negocio."
                ),
            })
        if ctx["colchon_pendiente"] > 0:
            alertas.append({
                "severidad": "MEDIA",
                "titulo": "Prestamos del colchon sin pagar",
                "detalle": f"Quedan {_format_money(ctx['colchon_pendiente'])} por cobrar de prestamos hechos desde el colchon financiero.",
            })
        if ctx["colchon_abonos"] - ctx["colchon_pendiente"] < ctx["colchon_base"] and ctx["colchon_base"] > 0:
            alertas.append({
                "severidad": "BAJA",
                "titulo": "Colchon financiero por completar",
                "detalle": f"El colchon busca {_format_money(ctx['colchon_base'])} de respaldo; el ahorro neto acumulado aun no esta completo.",
            })

    # Clientes y ticket promedio
    if ctx["clientes_count"] > 0 and ctx["cantidad"] > 0:
        fortalezas.append({
            "titulo": "Base de clientes y ticket promedio",
            "detalle": (
                f"{ctx['clientes_count']} clientes activos y {ctx['cantidad']} ventas en el periodo, "
                f"con un ticket promedio de {_format_money(ctx['facturado'] / ctx['cantidad'])}."
            ),
        })

    # Top productos
    if ctx["top_productos"]:
        mejor = ctx["top_productos"][0]
        fortalezas.append({
            "titulo": f"Producto estrella: {mejor['producto']}",
            "detalle": (
                f"Es el mas vendido con {_format_number(mejor['unidades'])} unidades y genera "
                f"{_format_money(mejor['utilidad'])} de utilidad estimada. Asegure stock permanente."
            ),
        })

    # Ranking de importancia
    gravedad = {"CRITICA": 0, "ALTA": 1, "MEDIA": 2, "BAJA": 3}
    alertas.sort(key=lambda a: gravedad.get(a["severidad"], 4))

    return fortalezas, alertas


def _veredicto(ganancia_caja, utilidad_comercial, alertas):
    criticas = sum(1 for a in alertas if a["severidad"] == "CRITICA")
    if ganancia_caja <= 0 or utilidad_comercial <= 0 or criticas >= 2:
        return (
            "El panorama general es de RIESGO: los indicadores muestran presion sobre la liquidez y/o la rentabilidad. "
            "Se recomienda actuar con prioridad sobre los puntos criticos detallados en este informe.", "En riesgo"
        )
    if criticas == 1:
        return (
            "La empresa opera con una salud general ACEPTABLE, aunque hay al menos un punto critico "
            "que conviene atender pronto para no comprometer los proximos meses.", "Con atencion"
        )
    return (
        "En general la empresa muestra una salud FINANCIERA SANA, con ingresos que superan los gastos y "
        "margenes positivos. Mantener el rumbo y atender las recomendaciones ayudara a sostener este resultado.",
        "Saludable",
    )


def _texto_proyeccion(escenarios, gastos_mensuales, promedio_diario, tendencia):
    if promedio_diario <= 0:
        return (
            "No se registraron ingresos suficientes en el periodo para construir una proyeccion confiable. "
            "Primero es necesario recuperar el ritmo de ventas."
        )
    realista = escenarios["realista"]
    pesimista = escenarios["pesimista"]
    optimista = escenarios["optimista"]
    return (
        f"Con un promedio de {_format_money(promedio_diario)} por dia y una tendencia de "
        f"{_format_number(tendencia)}% respecto al periodo anterior, se proyecta un ingreso mensual de "
        f"{_format_money(realista['ventas_mes'])} en el escenario realista, {_format_money(pesimista['ventas_mes'])} "
        f"en el pesimista (-10pp) y {_format_money(optimista['ventas_mes'])} en el optimista (+10pp). "
        f"Descontando gastos proyectados de {_format_money(gastos_mensuales)}, la utilidad mensual esperada seria de "
        f"{_format_money(realista['utilidad_mes'])} (realista), {_format_money(pesimista['utilidad_mes'])} (pesimista) y "
        f"{_format_money(optimista['utilidad_mes'])} (optimista)."
    )


def _recomendaciones(alertas):
    recomendaciones = []
    for a in alertas:
        if a["severidad"] == "CRITICA" and "Cartera vencida" in a["titulo"]:
            recomendaciones.append("Activar plan de cobro semanal para la cartera vencida de mas de 60 dias.")
        elif a["severidad"] == "CRITICA" and "Resultado negativo" in a["titulo"]:
            recomendaciones.append("Auditar gastos del mes, eliminar lo no esencial y lanzar una promo de reactivacion de ventas.")
        elif "stock" in a["titulo"].lower():
            recomendaciones.append("Generar solicitudes de pedido a proveedores para los productos con stock critico o agotados.")
        elif "margen" in a["titulo"].lower():
            recomendaciones.append("Revisar y recalcular el precio de venta de los productos sin margen.")
        elif "Prestamos" in a["titulo"]:
            recomendaciones.append("Definir fechas de pago para los prestamos internos y del colchon.")
        elif "Saldo negativo" in a["titulo"]:
            recomendaciones.append(f"Revisar los gastos y retiros del medio {a['titulo'].replace('Saldo negativo en ', '')}.")
    if not recomendaciones:
        recomendaciones.append("Sostener el ritmo de ventas, mantener el control de gastos y reponer stock de los productos estrella.")
    recomendaciones.append("Reinvertir una parte de la utilidad en inventario de alta rotacion y en reforzar el colchon financiero.")
    return recomendaciones