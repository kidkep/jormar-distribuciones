from pydantic import BaseModel, Field
from datetime import datetime
from decimal import Decimal


class PurchaseItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(ge=1)
    cost_price: Decimal


class PurchaseItemResponse(BaseModel):
    id: int
    purchase_id: int
    product_id: int
    quantity: int
    cost_price: Decimal
    total_price: Decimal
    product_name: str | None = None

    model_config = {"from_attributes": True}


class PurchaseCreate(BaseModel):
    supplier_id: int | None = None
    supplier_name: str | None = None
    purchase_date: datetime | None = None
    discount: Decimal = Decimal("0")
    notes: str | None = None
    items: list[PurchaseItemCreate] = Field(min_length=1)


class PurchaseResponse(BaseModel):
    id: int
    order_number: str
    purchase_date: datetime
    supplier_id: int | None = None
    supplier_name: str | None = None
    user_id: int
    subtotal: Decimal
    tax_amount: Decimal
    discount: Decimal
    total: Decimal
    status: str
    notes: str | None = None
    items: list[PurchaseItemResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SupplierPaymentCreate(BaseModel):
    amount: float = Field(gt=0)
    payment_method: str = "efectivo"
    payment_date: datetime | None = None
    notes: str | None = None


class SupplierPaymentResponse(BaseModel):
    id: int
    purchase_id: int
    amount: float
    payment_method: str
    payment_date: datetime
    notes: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SupplierAccountResponse(BaseModel):
    purchase_id: int
    order_number: str
    purchase_date: datetime
    supplier_id: int | None = None
    supplier_name: str | None = None
    total: float
    total_paid: float
    balance: float
    payments: list[SupplierPaymentResponse] = []

    model_config = {"from_attributes": True}
