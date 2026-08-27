from sqlalchemy.ext.asyncio import AsyncSession
from decimal import Decimal
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from app.models.sale import Sale, SaleItem
from app.models.product import Product
from app.repositories.sale_repository import SaleRepository
from app.repositories.product_repository import ProductRepository
from app.schemas.sale import SaleCreate
from app.exceptions import NotFoundException, BadRequestException
from app.services.distribution_service import DistributionService


class SaleService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = SaleRepository(db)
        self.product_repo = ProductRepository(db)

    async def get_sale(self, sale_id: int) -> Sale:
        sale = await self.repo.get_by_id(sale_id)
        if not sale:
            raise NotFoundException("Venta", sale_id)
        return sale

    async def get_sale_by_invoice(self, invoice_number: str) -> Sale:
        sale = await self.repo.get_by_invoice_number(invoice_number)
        if not sale:
            raise NotFoundException("Factura", invoice_number)
        return sale

    async def get_sales(self, skip: int = 0, limit: int = 50, search: str = "") -> tuple[list[Sale], int]:
        return await self.repo.get_all(skip, limit, search)

    async def create_sale(self, data: SaleCreate, user_id: int) -> Sale:
        subtotal = Decimal("0")
        items = []

        for item_data in data.items:
            product = await self.product_repo.get_by_id(item_data.product_id)
            if not product:
                raise NotFoundException("Producto", item_data.product_id)

            quantity = item_data.quantity
            unit_price = item_data.unit_price
            total_price = unit_price * quantity

            if product.current_stock < quantity:
                raise BadRequestException(
                    f"Stock insuficiente para {product.name}. "
                    f"Disponible: {product.current_stock}, solicitado: {quantity}"
                )

            product.current_stock -= quantity
            await self.product_repo.update(product)

            subtotal += total_price
            items.append(SaleItem(
                product_id=product.id,
                quantity=quantity,
                unit_price=unit_price,
                total_price=total_price,
            ))

        tax_amount = Decimal("0")
        discount = data.discount or Decimal("0")
        total = subtotal - discount

        invoice_number = await self.repo.get_next_invoice_number()

        sale = Sale(
            invoice_number=invoice_number,
            sale_date=data.sale_date or datetime.now(ZoneInfo("America/Bogota")).replace(tzinfo=None),
            client_id=data.client_id,
            user_id=user_id,
            subtotal=subtotal,
            tax_amount=tax_amount,
            discount=discount,
            total=total,
            payment_method=data.payment_method,
            notes=data.notes,
            delivery_address=data.delivery_address,
            delivered_by=data.delivered_by,
            status="pagada",
            items=items,
        )

        await self.repo.create(sale)
        sale_full = await self.repo.get_by_id(sale.id)

        try:
            dist_service = DistributionService(self.db)
            await dist_service.create_for_sale(sale_full)
        except Exception:
            pass

        return sale_full

    async def cancel_sale(self, sale_id: int) -> Sale:
        sale = await self.get_sale(sale_id)
        if sale.status == "anulada":
            raise BadRequestException("La venta ya está anulada")

        for item in sale.items:
            product = await self.product_repo.get_by_id(item.product_id)
            if product:
                product.current_stock += item.quantity
                await self.product_repo.update(product)

        sale.status = "anulada"
        result = await self.repo.update(sale)

        try:
            dist_service = DistributionService(self.db)
            await dist_service.delete_for_sale(sale.id)
        except Exception:
            pass

        return result
