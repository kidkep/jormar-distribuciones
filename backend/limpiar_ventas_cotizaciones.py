"""
Limpia las ventas y cotizaciones de la base de datos (para pruebas).

Restaura el stock de los productos descontado por las ventas y borra:
ventas, abonos (payments), distribuciones, cotizaciones y sus items.

IMPORTANTE: borra TODAS las ventas y cotizaciones. Ejecutar desde el
directorio backend con el venv activo:

    venv\\Scripts\\python.exe limpiar_ventas_cotizaciones.py
"""
import asyncio

from sqlalchemy import text

from app.database import engine


async def main():
    async with engine.connect() as conn:
        sales = (await conn.execute(text("SELECT COUNT(*) FROM sales"))).scalar()
        quotes = (await conn.execute(text("SELECT COUNT(*) FROM quotes"))).scalar()
        abonos = (await conn.execute(text("SELECT COUNT(*) FROM payments"))).scalar()
        print(f"Ventas: {sales} | Cotizaciones: {quotes} | Abonos: {abonos}")

        if sales == 0 and quotes == 0:
            print("No hay nada que borrar.")
            return

    respuesta = input(f"Escribe SI para borrar {sales} ventas y {quotes} cotizaciones (y restaurar stock): ")
    if respuesta.strip().upper() != "SI":
        print("Cancelado.")
        return

    async with engine.begin() as conn:
        # 1. Restaurar stock descontado por ventas no anuladas
        items = (await conn.execute(text(
            """
            SELECT si.product_id, SUM(si.quantity)
            FROM sale_items si
            JOIN sales s ON s.id = si.sale_id
            WHERE s.status <> 'anulada'
            GROUP BY si.product_id
            """
        ))).fetchall()
        for product_id, qty in items:
            await conn.execute(
                text("UPDATE products SET current_stock = current_stock + :qty WHERE id = :pid"),
                {"qty": qty, "pid": product_id},
            )
        print(f"Stock restaurado: {len(items)} productos")

        # 2. Borrar en orden respetando claves foraneas
        partes = (
            ("sale_distributions", None),
            ("payments", None),
            ("sale_items", None),
            ("sales", None),
            ("quote_items", None),
            ("quotes", None),
        )
        for table, _ in partes:
            await conn.execute(text(f"DELETE FROM {table}"))

        sales = (await conn.execute(text("SELECT COUNT(*) FROM sales"))).scalar()
        quotes = (await conn.execute(text("SELECT COUNT(*) FROM quotes"))).scalar()
        print(f"Listo. Ventas: {sales} | Cotizaciones: {quotes}")


asyncio.run(main())