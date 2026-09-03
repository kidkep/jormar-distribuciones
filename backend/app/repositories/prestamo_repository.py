from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.models.prestamo import Prestamo, PrestamoPago


class PrestamoRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, prestamo_id: int) -> Prestamo | None:
        result = await self.db.execute(
            select(Prestamo)
            .options(
                selectinload(Prestamo.user),
                selectinload(Prestamo.pagos).selectinload(PrestamoPago.user),
            )
            .where(Prestamo.id == prestamo_id)
        )
        return result.scalar_one_or_none()

    async def get_all(self, skip: int = 0, limit: int = 50, search: str = "", status: str = "") -> tuple[list[Prestamo], int]:
        query = select(Prestamo).options(
            selectinload(Prestamo.user),
            selectinload(Prestamo.pagos).selectinload(PrestamoPago.user),
        )
        count_query = select(func.count()).select_from(Prestamo)

        if search:
            query = query.where(Prestamo.person_name.ilike(f"%{search}%"))
            count_query = count_query.where(Prestamo.person_name.ilike(f"%{search}%"))

        if status:
            query = query.where(Prestamo.status == status)
            count_query = count_query.where(Prestamo.status == status)

        total_result = await self.db.execute(count_query)
        total = total_result.scalar()

        query = query.order_by(Prestamo.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all()), total or 0

    async def get_resumen(self) -> dict:
        total_q = await self.db.execute(
            select(func.coalesce(func.sum(Prestamo.amount), 0))
        )
        total_prestado = float(total_q.scalar() or 0)

        pending_q = await self.db.execute(
            select(func.coalesce(func.sum(Prestamo.remaining), 0)).where(Prestamo.status == "activo")
        )
        total_pendiente = float(pending_q.scalar() or 0)

        activos_result = await self.db.execute(
            select(func.count()).select_from(Prestamo).where(Prestamo.status == "activo")
        )
        prestamos_activos = activos_result.scalar() or 0

        pagados_result = await self.db.execute(
            select(func.count()).select_from(Prestamo).where(Prestamo.status == "pagado")
        )
        prestamos_pagados = pagados_result.scalar() or 0

        return {
            "total_prestado": total_prestado,
            "total_pendiente": total_pendiente,
            "total_pagado": round(total_prestado - total_pendiente, 2),
            "prestamos_activos": prestamos_activos,
            "prestamos_pagados": prestamos_pagados,
        }

    async def get_total_prestamos_por_categoria(self) -> dict:
        result = await self.db.execute(
            select(
                Prestamo.distribution_category,
                func.coalesce(func.sum(Prestamo.amount), 0),
            ).where(Prestamo.status != "cancelado")
            .group_by(Prestamo.distribution_category)
        )
        return {row[0]: float(row[1]) for row in result.all()}

    async def get_total_pagos_por_categoria(self) -> dict:
        result = await self.db.execute(
            select(
                Prestamo.distribution_category,
                func.coalesce(func.sum(PrestamoPago.amount), 0),
            ).join(PrestamoPago, PrestamoPago.prestamo_id == Prestamo.id)
            .where(Prestamo.status != "cancelado")
            .group_by(Prestamo.distribution_category)
        )
        return {row[0]: float(row[1]) for row in result.all()}

    async def get_pagos_por_metodo(self) -> dict:
        result = await self.db.execute(
            select(
                PrestamoPago.payment_method,
                func.coalesce(func.sum(PrestamoPago.amount), 0),
            ).group_by(PrestamoPago.payment_method)
        )
        return {row[0]: float(row[1]) for row in result.all()}

    async def get_prestamos_por_metodo_desembolsado(self) -> dict:
        result = await self.db.execute(
            select(
                Prestamo.payment_method,
                func.coalesce(func.sum(Prestamo.amount), 0),
            ).where(Prestamo.status != "cancelado")
            .group_by(Prestamo.payment_method)
        )
        return {row[0]: float(row[1]) for row in result.all()}

    async def create(self, prestamo: Prestamo) -> Prestamo:
        self.db.add(prestamo)
        await self.db.flush()
        await self.db.refresh(prestamo)
        return prestamo

    async def create_pago(self, pago: PrestamoPago) -> PrestamoPago:
        self.db.add(pago)
        await self.db.flush()
        await self.db.refresh(pago)
        return pago

    async def update(self, prestamo: Prestamo) -> Prestamo:
        await self.db.commit()
        await self.db.refresh(prestamo)
        return prestamo

    async def delete(self, prestamo: Prestamo) -> None:
        await self.db.delete(prestamo)
        await self.db.commit()
