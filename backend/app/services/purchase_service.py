from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from decimal import Decimal
from datetime import datetime
from zoneinfo import ZoneInfo

from app.models.purchase_order import PurchaseOrder, PurchaseOrderItem
from app.models.supplier import Supplier
from app.models.product import Product
from app.repositories.purchase_repository import PurchaseOrderRepository
from app.repositories.product_repository import ProductRepository
from app.schemas.purchase import PurchaseOrderCreate
from app.exceptions import NotFoundException, BadRequestException


class PurchaseOrderService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = PurchaseOrderRepository(db)
        self.product_repo = ProductRepository(db)

    async def get_order(self, order_id: int) -> PurchaseOrder:
        order = await self.repo.get_by_id(order_id)
        if not order:
            raise NotFoundException("Solicitud de pedido", order_id)
        return order

    async def get_orders(self, skip: int = 0, limit: int = 50, search: str = "") -> tuple[list[PurchaseOrder], int]:
        return await self.repo.get_all(skip, limit, search)

    async def _resolve_supplier_name(self, supplier_id: int | None, supplier_name: str | None) -> str | None:
        if supplier_id:
            result = await self.db.execute(select(Supplier).where(Supplier.id == supplier_id))
            supplier = result.scalar_one_or_none()
            if not supplier:
                raise NotFoundException("Proveedor", supplier_id)
            return supplier.name
        return supplier_name

    async def create_order(self, data: PurchaseOrderCreate, user_id: int) -> PurchaseOrder:
        subtotal = Decimal("0")
        items = []

        for item_data in data.items:
            product = await self.product_repo.get_by_id(item_data.product_id)
            if not product:
                raise NotFoundException("Producto", item_data.product_id)

            total_price = item_data.unit_price * item_data.quantity
            subtotal += total_price
            items.append(PurchaseOrderItem(
                product_id=product.id,
                quantity=item_data.quantity,
                unit_price=item_data.unit_price,
                total_price=total_price,
            ))

        discount = data.discount or Decimal("0")
        total = subtotal - discount

        supplier_name = await self._resolve_supplier_name(data.supplier_id, data.supplier_name)

        order_number = await self.repo.get_next_order_number()

        order = PurchaseOrder(
            order_number=order_number,
            order_date=data.order_date or datetime.now(ZoneInfo("America/Bogota")).replace(tzinfo=None),
            expected_date=data.expected_date,
            supplier_id=data.supplier_id,
            supplier_name=supplier_name,
            user_id=user_id,
            subtotal=subtotal,
            tax_amount=Decimal("0"),
            discount=discount,
            total=total,
            notes=data.notes,
            status="borrador",
            items=items,
        )

        await self.repo.create(order)
        return await self.repo.get_by_id(order.id)

    async def update_status(self, order_id: int, status: str) -> PurchaseOrder:
        valid_statuses = ["borrador", "enviada", "recibida", "cancelada"]
        if status not in valid_statuses:
            raise BadRequestException(f"Estado inválido. Valores permitidos: {', '.join(valid_statuses)}")

        order = await self.get_order(order_id)

        if status == "recibida" and order.status != "recibida":
            await self._increment_stock(order)

        order.status = status
        return await self.repo.update(order)

    async def _increment_stock(self, order: PurchaseOrder) -> None:
        for item in order.items:
            result = await self.db.execute(select(Product).where(Product.id == item.product_id))
            product = result.scalar_one_or_none()
            if product:
                product.current_stock += item.quantity
        await self.db.commit()

    async def delete_order(self, order_id: int) -> None:
        order = await self.get_order(order_id)
        if order.status not in ("borrador", "cancelada"):
            raise BadRequestException("Solo se pueden eliminar solicitudes en borrador o canceladas")
        await self.db.delete(order)
        await self.db.commit()
