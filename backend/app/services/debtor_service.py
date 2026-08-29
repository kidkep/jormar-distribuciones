from sqlalchemy.ext.asyncio import AsyncSession
from decimal import Decimal
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from app.models.payment import Payment
from app.repositories.debtor_repository import DebtorRepository
from app.repositories.sale_repository import SaleRepository
from app.schemas.debtor import PaymentCreate
from app.exceptions import NotFoundException, BadRequestException
from app.services.distribution_service import DistributionService


class DebtorService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = DebtorRepository(db)
        self.sale_repo = SaleRepository(db)

    async def get_debtors(self, skip: int = 0, limit: int = 50) -> tuple[list, int]:
        sales, total = await self.repo.get_credit_sales(skip, limit)

        debtors = []
        for sale in sales:
            total_paid = sum(float(p.amount) for p in sale.payments)
            balance = float(sale.total) - total_paid
            debtors.append({
                "sale_id": sale.id,
                "invoice_number": sale.invoice_number,
                "sale_date": sale.sale_date,
                "client_id": sale.client_id,
                "client_name": sale.client_name or (sale.client.name if sale.client else None),
                "client_document": sale.client.document_number if sale.client else None,
                "total": sale.total,
                "total_paid": Decimal(str(total_paid)),
                "balance": Decimal(str(balance)),
                "items": [
                    {"product_name": item.product.name if item.product else "N/A", "quantity": item.quantity, "unit_price": item.unit_price, "total_price": item.total_price}
                    for item in sale.items
                ],
                "payments": sale.payments,
            })

        return debtors, total

    async def register_payment(self, sale_id: int, data: PaymentCreate) -> Payment:
        sale = await self.sale_repo.get_by_id(sale_id)
        if not sale:
            raise NotFoundException("Venta", sale_id)

        if sale.payment_method != "credito":
            raise BadRequestException("Esta venta no es a crédito")

        total_paid = sum(float(p.amount) for p in sale.payments)
        balance = float(sale.total) - total_paid

        if float(data.amount) > balance:
            raise BadRequestException(f"El abono (${data.amount}) excede el saldo (${balance:.0f})")

        payment = Payment(
            sale_id=sale_id,
            amount=float(data.amount),
            payment_method=data.payment_method,
            payment_date=data.payment_date or datetime.now(ZoneInfo("America/Bogota")).replace(tzinfo=None),
            notes=data.notes,
        )

        payment = await self.repo.create_payment(payment)

        try:
            dist_service = DistributionService(self.db)
            await dist_service.register_receipt(sale_id, Decimal(str(data.amount)))
        except Exception:
            pass

        if (total_paid + float(data.amount)) >= float(sale.total):
            sale.status = "pagada"
            await self.sale_repo.update(sale)

        return payment
