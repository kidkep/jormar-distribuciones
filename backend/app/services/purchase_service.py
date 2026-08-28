from sqlalchemy.ext.asyncio import AsyncSession
from decimal import Decimal
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from app.models.purchase import Purchase, PurchaseItem, SupplierPayment
from app.models.product import Product
from app.models.supplier import Supplier
from app.repositories.purchase_repository import PurchaseRepository, SupplierPaymentRepository
from app.repositories.product_repository import ProductRepository
from app.repositories.supplier_repository import SupplierRepository
from app.schemas.purchase import PurchaseCreate, SupplierPaymentCreate
from app.exceptions import NotFoundException, BadRequestException


class PurchaseService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = PurchaseRepository(db)
        self.payment_repo = SupplierPaymentRepository(db)
        self.product_repo = ProductRepository(db)
        self.supplier_repo = SupplierRepository(db)

    async def get_purchase(self, purchase_id: int) -> Purchase:
        purchase = await self.repo.get_by_id(purchase_id)
        if not purchase:
            raise NotFoundException("Compra", purchase_id)
        return purchase

    async def get_purchases(self, skip: int = 0, limit: int = 50, search: str = "") -> tuple[list[Purchase], int]:
        return await self.repo.get_all(skip, limit, search)

    async def create_purchase(self, data: PurchaseCreate, user_id: int) -> Purchase:
        subtotal = Decimal("0")
        items = []

        for item_data in data.items:
            product = await self.product_repo.get_by_id(item_data.product_id)
            if not product:
                raise NotFoundException("Producto", item_data.product_id)

            quantity = item_data.quantity
            cost_price = item_data.cost_price
            total_price = cost_price * quantity

            product.current_stock += quantity
            await self.product_repo.update(product)

            subtotal += total_price
            items.append(PurchaseItem(
                product_id=product.id,
                quantity=quantity,
                cost_price=cost_price,
                total_price=total_price,
            ))

        if data.supplier_id:
            supplier = await self.supplier_repo.get_by_id(data.supplier_id)
            if not supplier:
                raise NotFoundException("Proveedor", data.supplier_id)
            supplier_name = supplier.name
        else:
            supplier_name = data.supplier_name

        tax_amount = Decimal("0")
        discount = data.discount or Decimal("0")
        total = subtotal - discount

        order_number = await self.repo.get_next_order_number()

        purchase = Purchase(
            order_number=order_number,
            purchase_date=data.purchase_date or datetime.now(ZoneInfo("America/Bogota")).replace(tzinfo=None),
            supplier_id=data.supplier_id,
            supplier_name=supplier_name,
            user_id=user_id,
            subtotal=subtotal,
            tax_amount=tax_amount,
            discount=discount,
            total=total,
            notes=data.notes,
            items=items,
        )

        purchase = await self.repo.create(purchase)
        return await self.repo.get_by_id(purchase.id)

    async def get_supplier_accounts(self, skip: int = 0, limit: int = 50, search: str = "") -> tuple[list, int]:
        purchases, total = await self.repo.get_all(skip, limit, search)

        accounts = []
        for purchase in purchases:
            payments = await self.payment_repo.get_by_purchase(purchase.id)
            total_paid = sum(float(p.amount) for p in payments)
            balance = float(purchase.total) - total_paid
            accounts.append({
                "purchase_id": purchase.id,
                "order_number": purchase.order_number,
                "purchase_date": purchase.purchase_date,
                "supplier_id": purchase.supplier_id,
                "supplier_name": purchase.supplier_name,
                "total": float(purchase.total),
                "total_paid": total_paid,
                "balance": balance,
                "payments": payments,
            })

        return accounts, total

    async def get_payable_summary(self) -> dict:
        purchases, total = await self.repo.get_all(0, 100000)
        total_debt = 0.0
        total_paid = 0.0
        for purchase in purchases:
            payments = await self.payment_repo.get_by_purchase(purchase.id)
            paid = sum(float(p.amount) for p in payments)
            total_paid += paid
            total_debt += float(purchase.total)
        return {
            "total_debt": total_debt,
            "total_paid": total_paid,
            "total_balance": total_debt - total_paid,
            "count": len(purchases),
        }

    async def register_supplier_payment(self, purchase_id: int, data: SupplierPaymentCreate) -> SupplierPayment:
        purchase = await self.get_purchase(purchase_id)

        payments = await self.payment_repo.get_by_purchase(purchase_id)
        total_paid = sum(float(p.amount) for p in payments)
        balance = float(purchase.total) - total_paid

        if float(data.amount) > balance:
            raise BadRequestException(f"El abono (${data.amount}) excede el saldo (${balance:.0f})")

        payment = SupplierPayment(
            purchase_id=purchase_id,
            amount=float(data.amount),
            payment_method=data.payment_method,
            payment_date=data.payment_date or datetime.now(ZoneInfo("America/Bogota")).replace(tzinfo=None),
            notes=data.notes,
        )

        payment = await self.payment_repo.create(payment)

        if (total_paid + float(data.amount)) >= float(purchase.total):
            purchase.status = "pagada"
            await self.repo.update(purchase)

        return payment
