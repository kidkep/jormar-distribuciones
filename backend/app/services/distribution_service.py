from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime

from app.models.distribution import SaleDistribution
from app.models.sale import Sale
from app.repositories.distribution_repository import DistributionRepository


DEFAULT_PCT_UTILIDAD = Decimal("20")
DEFAULT_PCT_GASTOS = Decimal("10")
DEFAULT_PCT_INVERSION = Decimal("70")


def calculate_distribution(
    sale_total: Decimal,
    pct_utilidad: Decimal = DEFAULT_PCT_UTILIDAD,
    pct_gastos: Decimal = DEFAULT_PCT_GASTOS,
    pct_inversion: Decimal = DEFAULT_PCT_INVERSION,
) -> dict:
    total_pct = pct_utilidad + pct_gastos + pct_inversion
    if total_pct != Decimal("100"):
        raise ValueError(
            f"Los porcentajes deben sumar 100%. Actualmente suman {total_pct}%"
        )

    monto_utilidad = (sale_total * pct_utilidad / Decimal("100")).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
    monto_gastos = (sale_total * pct_gastos / Decimal("100")).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
    monto_inversion = (sale_total * pct_inversion / Decimal("100")).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )

    calculated_total = monto_utilidad + monto_gastos + monto_inversion
    difference = sale_total - calculated_total
    if difference != Decimal("0"):
        monto_inversion += difference

    return {
        "pct_utilidad": float(pct_utilidad),
        "pct_gastos": float(pct_gastos),
        "pct_inversion": float(pct_inversion),
        "monto_utilidad": float(monto_utilidad),
        "monto_gastos": float(monto_gastos),
        "monto_inversion": float(monto_inversion),
    }


class DistributionService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = DistributionRepository(db)

    async def create_for_sale(self, sale: Sale) -> SaleDistribution:
        sale_total = Decimal(str(sale.total))

        is_credit = sale.payment_method == "credito"
        monto_recibido = Decimal("0") if is_credit else sale_total
        amounts = calculate_distribution(monto_recibido)
        status = "pendiente" if is_credit else "activa"

        client_name = None
        if sale.client_name:
            client_name = sale.client_name
        elif sale.client:
            client_name = sale.client.name

        distribution = SaleDistribution(
            sale_id=sale.id,
            sale_date=sale.sale_date,
            sale_total=sale_total,
            monto_recibido=monto_recibido,
            invoice_number=sale.invoice_number,
            client_name=client_name,
            payment_method=sale.payment_method,
            status=status,
            **amounts,
        )

        return await self.repo.create(distribution)

    async def register_receipt(self, sale_id: int, amount: Decimal) -> None:
        result = await self.db.execute(
            select(SaleDistribution).where(SaleDistribution.sale_id == sale_id)
        )
        dist = result.scalar_one_or_none()
        if not dist:
            return

        new_recibido = Decimal(str(dist.monto_recibido)) + amount
        if new_recibido > Decimal(str(dist.sale_total)):
            new_recibido = Decimal(str(dist.sale_total))

        dist.monto_recibido = new_recibido

        amounts = calculate_distribution(
            new_recibido,
            Decimal(str(dist.pct_utilidad)),
            Decimal(str(dist.pct_gastos)),
            Decimal(str(dist.pct_inversion)),
        )
        dist.monto_utilidad = amounts["monto_utilidad"]
        dist.monto_gastos = amounts["monto_gastos"]
        dist.monto_inversion = amounts["monto_inversion"]

        if new_recibido > 0:
            dist.status = "activa"

        await self.db.flush()

    async def delete_for_sale(self, sale_id: int) -> None:
        await self.repo.delete_by_sale_id(sale_id)

    async def update_status_for_sale(self, sale_id: int, status: str) -> None:
        result = await self.db.execute(
            select(SaleDistribution).where(SaleDistribution.sale_id == sale_id)
        )
        dist = result.scalar_one_or_none()
        if dist:
            dist.status = status
            await self.db.flush()

    async def get_all(
        self, skip: int = 0, limit: int = 50
    ) -> list[SaleDistribution]:
        return await self.repo.get_all(skip, limit)

    async def get_summary(
        self,
        fecha_inicio: datetime | None = None,
        fecha_fin: datetime | None = None,
    ) -> dict:
        return await self.repo.get_summary(fecha_inicio, fecha_fin)

    async def get_config(self) -> dict:
        return await self.repo.get_config()
