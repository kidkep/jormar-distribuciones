from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from zoneinfo import ZoneInfo

from app.models.colchon import ColchonConfig, ColchonPrestamo, ColchonPago
from app.repositories.colchon_repository import ColchonRepository
from app.schemas.colchon import ColchonMontoUpdate, ColchonPrestamoCreate, ColchonPagoCreate
from app.api.v1.caja import compute_inversion_neta
from app.exceptions import NotFoundException, BadRequestException

VALID_METHODS = {"efectivo", "nequi", "bancolombia", "bogota"}


class ColchonService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ColchonRepository(db)

    async def get_config(self) -> ColchonConfig:
        return await self.repo.get_config()

    async def update_monto_base(self, data: ColchonMontoUpdate) -> ColchonConfig:
        return await self.repo.set_monto_base(float(data.monto_base))

    async def get_resumen(self) -> dict:
        config = await self.repo.get_config()
        totales = await self.repo.get_totales()
        saldo_disponible = round(float(config.monto_base) - totales["total_prestado"], 2)
        return {
            "monto_base": float(config.monto_base),
            "saldo_disponible": saldo_disponible,
            **totales,
        }

    async def get_prestamo(self, prestamo_id: int) -> ColchonPrestamo:
        prestamo = await self.repo.get_prestamo_by_id(prestamo_id)
        if not prestamo:
            raise NotFoundException("Prestamo del colchon", prestamo_id)
        return prestamo

    async def get_prestamos(self, search: str = "", status: str = "") -> list[ColchonPrestamo]:
        return await self.repo.get_all(search=search, status=status)

    async def create_prestamo(self, data: ColchonPrestamoCreate, user_id: int) -> ColchonPrestamo:
        if data.payment_method not in VALID_METHODS:
            raise BadRequestException("Metodo de pago invalido")

        resumen = await self.get_resumen()
        saldo_disponible = resumen["saldo_disponible"]
        if float(data.amount) > saldo_disponible:
            raise BadRequestException(
                f"Saldo insuficiente en el colchon. Disponible: ${saldo_disponible:,.0f}, solicitado: ${float(data.amount):,.0f}"
            )

        prestamo = ColchonPrestamo(
            person_name=data.person_name.strip(),
            amount=float(data.amount),
            remaining=float(data.amount),
            payment_method=data.payment_method,
            description=data.description.strip(),
            status="activo",
            notes=data.notes,
            user_id=user_id,
        )
        return await self.repo.create(prestamo)

    async def registrar_pago(self, prestamo_id: int, data: ColchonPagoCreate, user_id: int) -> ColchonPago:
        prestamo = await self.get_prestamo(prestamo_id)

        if prestamo.status != "activo":
            raise BadRequestException(f"El prestamo esta en estado '{prestamo.status}', no se pueden registrar pagos")

        if float(data.amount) > float(prestamo.remaining):
            raise BadRequestException(
                f"El abono (${float(data.amount):,.0f}) excede el saldo pendiente (${float(prestamo.remaining):,.0f})"
            )

        if data.payment_method not in VALID_METHODS:
            raise BadRequestException("Metodo de pago invalido")

        # El abono se paga con inversion: verificar que la inversion sea suficiente
        inversion_neta = await compute_inversion_neta(self.db)
        if float(data.amount) > inversion_neta:
            raise BadRequestException(
                f"Inversion insuficiente para el abono. Inversion disponible: ${inversion_neta:,.0f}, abono: ${float(data.amount):,.0f}"
            )

        payment_date = datetime.now(ZoneInfo("America/Bogota")).replace(tzinfo=None)
        if data.payment_date:
            payment_date = datetime.strptime(data.payment_date, "%Y-%m-%d")

        pago = ColchonPago(
            colchon_prestamo_id=prestamo.id,
            amount=float(data.amount),
            payment_method=data.payment_method,
            payment_date=payment_date,
            notes=data.notes,
            user_id=user_id,
        )
        await self.repo.create_pago(pago)

        prestamo.remaining = round(float(prestamo.remaining) - float(data.amount), 2)
        if prestamo.remaining <= 0:
            prestamo.remaining = 0
            prestamo.status = "pagado"
        await self.repo.update(prestamo)

        return pago

    async def delete_prestamo(self, prestamo_id: int) -> None:
        prestamo = await self.get_prestamo(prestamo_id)
        if prestamo.pagos:
            raise BadRequestException("No se puede eliminar un prestamo que ya tiene pagos registrados")
        await self.repo.delete(prestamo)
