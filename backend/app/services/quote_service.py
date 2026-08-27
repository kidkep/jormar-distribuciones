from sqlalchemy.ext.asyncio import AsyncSession
from decimal import Decimal
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from app.models.quote import Quote, QuoteItem
from app.repositories.quote_repository import QuoteRepository
from app.repositories.product_repository import ProductRepository
from app.schemas.quote import QuoteCreate
from app.exceptions import NotFoundException, BadRequestException


class QuoteService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = QuoteRepository(db)
        self.product_repo = ProductRepository(db)

    async def get_quote(self, quote_id: int) -> Quote:
        quote = await self.repo.get_by_id(quote_id)
        if not quote:
            raise NotFoundException("Cotización", quote_id)
        return quote

    async def get_quotes(self, skip: int = 0, limit: int = 50, search: str = "") -> tuple[list[Quote], int]:
        return await self.repo.get_all(skip, limit, search)

    async def create_quote(self, data: QuoteCreate, user_id: int) -> Quote:
        subtotal = Decimal("0")
        items = []

        for item_data in data.items:
            product = await self.product_repo.get_by_id(item_data.product_id)
            if not product:
                raise NotFoundException("Producto", item_data.product_id)

            total_price = item_data.unit_price * item_data.quantity
            subtotal += total_price
            items.append(QuoteItem(
                product_id=product.id,
                quantity=item_data.quantity,
                unit_price=item_data.unit_price,
                total_price=total_price,
            ))

        tax_amount = Decimal("0")
        discount = data.discount or Decimal("0")
        total = subtotal - discount

        quote_number = await self.repo.get_next_quote_number()

        quote = Quote(
            quote_number=quote_number,
            quote_date=data.quote_date or datetime.now(ZoneInfo("America/Bogota")).replace(tzinfo=None),
            valid_until=data.valid_until,
            client_id=data.client_id,
            client_name=data.client_name,
            user_id=user_id,
            subtotal=subtotal,
            tax_amount=tax_amount,
            discount=discount,
            total=total,
            notes=data.notes,
            status="borrador",
            items=items,
        )

        await self.repo.create(quote)
        return await self.repo.get_by_id(quote.id)

    async def update_status(self, quote_id: int, status: str) -> Quote:
        valid_statuses = ["borrador", "enviada", "aceptada", "rechazada"]
        if status not in valid_statuses:
            raise BadRequestException(f"Estado inválido. Valores permitidos: {', '.join(valid_statuses)}")

        quote = await self.get_quote(quote_id)
        quote.status = status
        return await self.repo.update(quote)

    async def delete_quote(self, quote_id: int) -> None:
        quote = await self.get_quote(quote_id)
        if quote.status not in ("borrador", "rechazada"):
            raise BadRequestException("Solo se pueden eliminar cotizaciones en borrador o rechazadas")
        await self.db.delete(quote)
        await self.db.commit()
