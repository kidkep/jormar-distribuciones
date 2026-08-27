from pydantic import BaseModel, Field
from datetime import datetime
from decimal import Decimal


class ProductBrief(BaseModel):
    id: int
    name: str
    sku: str | None = None
    model_config = {"from_attributes": True}


class ClientBrief(BaseModel):
    id: int
    name: str
    document_number: str | None = None
    model_config = {"from_attributes": True}


class SaleItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(ge=1)
    unit_price: Decimal


class SaleItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    unit_price: Decimal
    total_price: Decimal
    product: ProductBrief | None = None

    model_config = {"from_attributes": True}


class SaleCreate(BaseModel):
    client_id: int | None = None
    sale_date: datetime | None = None
    payment_method: str = "efectivo"
    discount: Decimal = Decimal("0")
    notes: str | None = None
    delivery_address: str | None = None
    delivered_by: str | None = None
    items: list[SaleItemCreate] = Field(min_length=1)


class SaleResponse(BaseModel):
    id: int
    invoice_number: str
    sale_date: datetime
    client_id: int | None = None
    client: ClientBrief | None = None
    user_id: int
    subtotal: Decimal
    tax_amount: Decimal
    discount: Decimal
    total: Decimal
    payment_method: str
    status: str
    notes: str | None = None
    delivery_address: str | None = None
    delivered_by: str | None = None
    items: list[SaleItemResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
