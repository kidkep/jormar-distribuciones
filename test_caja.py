import asyncio
import sys
sys.path.insert(0, "C:/Users/JUANCA/jormar-distribuciones/backend")

async def test():
    from app.api.v1.caja import get_caja_resumen
    from app.database import AsyncSessionLocal
    from app.models.user import User
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).options(selectinload(User.role)).where(User.id == 1))
        user = result.scalar_one_or_none()
        print(f"User: {user.username}, is_superuser: {user.is_superuser}")
        
        try:
            resp = await get_caja_resumen(db=db, _user=user)
            print(f"saldo_total: {resp['saldo_total']}")
            print(f"saldo_por_metodo: {resp['saldo_por_metodo']}")
            print(f"total_retiros: {resp['total_retiros']}")
        except Exception as e:
            import traceback
            traceback.print_exc()

asyncio.run(test())
