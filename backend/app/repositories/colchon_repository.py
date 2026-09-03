from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from sqlalchemy.orm import selectinload

from app.models.colchon import ColchonConfig, ColchonPrestamo, ColchonPago


class ColchonRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    # --- Config (monto base) ---
    async def get_config(self) -> ColchonConfig:
        result = await self.db.execute(select(ColchonConfig).order_by(ColchonConfig.id).limit(1))
        config = result.scalar_one_or_none()
        if not config:
            config = ColchonConfig(monto_base=1000000)
            self.db.add(config)
            await self.db.commit()
            await self.db.refresh(config)
        return config

    async def set_monto_base(self, monto_base: float) -> ColchonConfig:
        config = await self.get_config()
        config.monto_base = monto_base
        await self.db.commit()
        await self.db.refresh(config)
        return config

    # --- Prestamos ---
    async def get_prestamo_by_id(self, prestamo_id: int) -> ColchonPrestamo | None:
        result = await self.db.execute(
            select(ColchonPrestamo)
            .options(
                selectinload(ColchonPrestamo.user),
                selectinload(ColchonPrestamo.pagos).selectinload(ColchonPago.user),
            )
            .where(ColchonPrestamo.id == prestamo_id)
        )
        return result.scalar_one_or_none()

    async def get_all(self, skip: int = 0, limit: int = 200, search: str = "", status: str = "") -> list[ColchonPrestamo]:
        query = select(ColchonPrestamo).options(
            selectinload(ColchonPrestamo.user),
            selectinload(ColchonPrestamo.pagos).selectinload(ColchonPago.user),
        )
        if search:
            query = query.where(ColchonPrestamo.person_name.ilike(f"%{search}%"))
        if status:
            query = query.where(ColchonPrestamo.status == status)
        query = query.order_by(ColchonPrestamo.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def create(self, prestamo: ColchonPrestamo) -> ColchonPrestamo:
        self.db.add(prestamo)
        await self.db.flush()
        await self.db.refresh(prestamo)
        return prestamo

    async def create_pago(self, pago: ColchonPago) -> ColchonPago:
        self.db.add(pago)
        await self.db.flush()
        await self.db.refresh(pago)
        return pago

    async def update(self, prestamo: ColchonPrestamo) -> None:
        await self.db.commit()
        await self.db.refresh(prestamo)

    async def delete(self, prestamo: ColchonPrestamo) -> None:
        await self.db.delete(prestamo)
        await self.db.commit()

    # --- Resumen ---
    async def get_totales(self) -> dict:
        total_prestado_q = await self.db.execute(
            select(func.coalesce(func.sum(ColchonPrestamo.amount), 0))
        )
        total_prestado = float(total_prestado_q.scalar() or 0)

        pendiente_q = await self.db.execute(
            select(func.coalesce(func.sum(ColchonPrestamo.remaining), 0))
            .where(ColchonPrestamo.status == "activo")
        )
        total_pendiente = float(pendiente_q.scalar() or 0)

        activos = await self.db.execute(
            select(func.count()).select_from(ColchonPrestamo).where(ColchonPrestamo.status == "activo")
        )
        pagados = await self.db.execute(
            select(func.count()).select_from(ColchonPrestamo).where(ColchonPrestamo.status == "pagado")
        )

        return {
            "total_prestado": total_prestado,
            "total_pendiente": total_pendiente,
            "total_pagado": round(total_prestado - total_pendiente, 2),
            "prestamos_activos": activos.scalar() or 0,
            "prestamos_pagados": pagados.scalar() or 0,
        }

    # --- Pagos del colchon que descuentan de inversion (para caja/balance) ---
    async def get_total_pagos(self) -> float:
        r = await self.db.execute(select(func.coalesce(func.sum(ColchonPago.amount), 0)))
        return float(r.scalar() or 0)
