from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from zoneinfo import ZoneInfo

from app.models.prestamo import Prestamo, PrestamoPago
from app.repositories.prestamo_repository import PrestamoRepository
from app.schemas.prestamo import PrestamoCreate, PrestamoPagoCreate
from app.exceptions import NotFoundException, BadRequestException


class PrestamoService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = PrestamoRepository(db)

    async def get_prestamo(self, prestamo_id: int) -> Prestamo:
        prestamo = await self.repo.get_by_id(prestamo_id)
        if not prestamo:
            raise NotFoundException("Prestamo", prestamo_id)
        return prestamo

    async def get_prestamos(self, skip: int = 0, limit: int = 50, search: str = "", status: str = "") -> tuple[list[Prestamo], int]:
        return await self.repo.get_all(skip, limit, search, status)

    async def get_resumen(self) -> dict:
        return await self.repo.get_resumen()

    async def create_prestamo(self, data: PrestamoCreate, user_id: int) -> Prestamo:
        if data.amount <= 0:
            raise BadRequestException("El monto debe ser mayor a 0")

        valid_categories = {"utilidad", "inversion", "costos"}
        if data.distribution_category not in valid_categories:
            raise BadRequestException("Categoria invalida. Usa: utilidad, inversion, costos")

        valid_methods = {"efectivo", "nequi", "bancolombia", "bogota"}
        if data.payment_method not in valid_methods:
            raise BadRequestException("Metodo de pago invalido")

        prestamo = Prestamo(
            person_name=data.person_name.strip(),
            amount=float(data.amount),
            remaining=float(data.amount),
            distribution_category=data.distribution_category,
            payment_method=data.payment_method,
            description=data.description.strip(),
            status="activo",
            reference=data.reference,
            notes=data.notes,
            user_id=user_id,
        )
        return await self.repo.create(prestamo)

    async def registrar_pago(self, prestamo_id: int, data: PrestamoPagoCreate, user_id: int) -> PrestamoPago:
        prestamo = await self.get_prestamo(prestamo_id)

        if prestamo.status != "activo":
            raise BadRequestException(f"El prestamo esta en estado '{prestamo.status}', no se pueden registrar pagos")

        if data.amount <= 0:
            raise BadRequestException("El monto del pago debe ser mayor a 0")

        if float(data.amount) > float(prestamo.remaining):
            raise BadRequestException(
                f"El pago (${data.amount:,.0f}) excede el saldo pendiente (${prestamo.remaining:,.0f})"
            )

        valid_methods = {"efectivo", "nequi", "bancolombia", "bogota"}
        if data.payment_method not in valid_methods:
            raise BadRequestException("Metodo de pago invalido")

        payment_date = datetime.now(ZoneInfo("America/Bogota")).replace(tzinfo=None)
        if data.payment_date:
            payment_date = datetime.strptime(data.payment_date, "%Y-%m-%d")

        pago = PrestamoPago(
            prestamo_id=prestamo.id,
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
            raise BadRequestException("No se puede eliminar un prestamo que ya tiene pagos registrados. Elimina los pagos primero.")
        await self.repo.delete(prestamo)
