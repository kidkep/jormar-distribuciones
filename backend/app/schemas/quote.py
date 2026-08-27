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


class QuoteItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(ge=1)
    unit_price: Decimal


class QuoteItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    unit_price: Decimal
    total_price: Decimal
    product: ProductBrief | None = None

    model_config = {"from_attributes": True}


class QuoteCreate(BaseModel):
    client_id: int | None = None
    quote_date: datetime | None = None
    valid_until: datetime | None = None
    discount: Decimal = Decimal("0")
    notes: str | None = None
    items: list[QuoteItemCreate] = Field(min_length=1)


class QuoteResponse(BaseModel):
    id: int
    quote_number: str
    quote_date: datetime
    valid_until: datetime | None = None
    client_id: int | None = None
    client: ClientBrief | None = None
    user_id: int
    subtotal: Decimal
    tax_amount: Decimal
    discount: Decimal
    total: Decimal
    status: str
    notes: str | None = None
    items: list[QuoteItemResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
