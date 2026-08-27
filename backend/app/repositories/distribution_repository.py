from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime

from app.models.distribution import SaleDistribution


class DistributionRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, distribution: SaleDistribution) -> SaleDistribution:
        self.db.add(distribution)
        await self.db.flush()
        await self.db.refresh(distribution)
        return distribution

    async def delete_by_sale_id(self, sale_id: int) -> None:
        result = await self.db.execute(
            select(SaleDistribution).where(SaleDistribution.sale_id == sale_id)
        )
        dist = result.scalar_one_or_none()
        if dist:
            await self.db.delete(dist)
            await self.db.flush()

    async def get_all(self, skip: int = 0, limit: int = 50) -> list[SaleDistribution]:
        query = (
            select(SaleDistribution)
            .order_by(SaleDistribution.sale_date.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_summary(
        self,
        fecha_inicio: datetime | None = None,
        fecha_fin: datetime | None = None,
    ) -> dict:
        query = select(SaleDistribution).where(SaleDistribution.status == "activa")

        if fecha_inicio:
            query = query.where(SaleDistribution.sale_date >= fecha_inicio)
        if fecha_fin:
            query = query.where(SaleDistribution.sale_date <= fecha_fin)

        result = await self.db.execute(query)
        distributions = list(result.scalars().all())

        total_ventas = sum(float(d.sale_total) for d in distributions)
        total_utilidad = sum(float(d.monto_utilidad) for d in distributions)
        total_gastos = sum(float(d.monto_gastos) for d in distributions)
        total_inversion = sum(float(d.monto_inversion) for d in distributions)

        return {
            "total_ventas": round(total_ventas, 2),
            "total_utilidad": round(total_utilidad, 2),
            "total_gastos": round(total_gastos, 2),
            "total_inversion": round(total_inversion, 2),
            "count_ventas": len(distributions),
            "pct_utilidad": 20.0,
            "pct_gastos": 10.0,
            "pct_inversion": 70.0,
        }

    async def get_config(self) -> dict:
        return {
            "pct_utilidad": 20.0,
            "pct_gastos": 10.0,
            "pct_inversion": 70.0,
        }
