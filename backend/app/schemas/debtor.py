from pydantic import BaseModel, Field
from datetime import datetime


class PaymentCreate(BaseModel):
    amount: float = Field(gt=0)
    payment_method: str = "efectivo"
    payment_date: datetime | None = None
    notes: str | None = None


class PaymentResponse(BaseModel):
    id: int
    sale_id: int
    amount: float
    payment_method: str
    payment_date: datetime
    notes: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class DebtorResponse(BaseModel):
    sale_id: int
    invoice_number: str
    sale_date: datetime
    client_id: int | None = None
    client_name: str | None = None
    client_document: str | None = None
    total: float
    total_paid: float
    balance: float
    items: list[dict] = []
    payments: list[PaymentResponse] = []

    model_config = {"from_attributes": True}
