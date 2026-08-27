import asyncio
from app.database import engine
from sqlalchemy import text

async def check():
    async with engine.connect() as conn:
        tables = await conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))
        print("=== TABLAS ===")
        for t in tables:
            print(f"  {t[0]}")

        for table in ["products", "clients", "suppliers", "categories", "units", "users", "sales", "quotes", "expenses", "payments"]:
            result = await conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
            count = result.scalar()
            print(f"\n{table}: {count} registros")
            if count > 0:
                rows = await conn.execute(text(f"SELECT * FROM {table} LIMIT 2"))
                cols = rows.keys()
                for r in rows:
                    print(f"  {dict(zip(cols, r))}")

asyncio.run(check())
