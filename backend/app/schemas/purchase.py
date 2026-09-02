from pydantic import BaseModel, Field
from datetime import datetime
from decimal import Decimal


class SupplierBrief(BaseModel):
    id: int
    name: str
    document_number: str | None = None
    model_config = {"from_attributes": True}


class ProductBrief(BaseModel):
    id: int
    name: str
    sku: str | None = None
    model_config = {"from_attributes": True}


class PurchaseOrderItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(ge=1)
    unit_price: Decimal


class PurchaseOrderItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    unit_price: Decimal
    total_price: Decimal
    product: ProductBrief | None = None

    model_config = {"from_attributes": True}


class PurchaseOrderCreate(BaseModel):
    supplier_id: int | None = None
    supplier_name: str | None = None
    order_date: datetime | None = None
    expected_date: datetime | None = None
    discount: Decimal = Decimal("0")
    notes: str | None = None
    items: list[PurchaseOrderItemCreate] = Field(min_length=1)


class PurchaseOrderResponse(BaseModel):
    id: int
    order_number: str
    order_date: datetime
    expected_date: datetime | None = None
    supplier_id: int | None = None
    supplier: SupplierBrief | None = None
    supplier_name: str | None = None
    user_id: int
    subtotal: Decimal
    tax_amount: Decimal
    discount: Decimal
    total: Decimal
    status: str
    notes: str | None = None
    items: list[PurchaseOrderItemResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
