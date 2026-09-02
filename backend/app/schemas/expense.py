from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal


class ExpenseCreate(BaseModel):
    description: str
    amount: Decimal
    category: str = "general"
    expense_date: datetime | None = None
    payment_method: str = "efectivo"
    reference: str | None = None
    notes: str | None = None
    distribution_category: str = "costos"


class ExpenseUpdate(BaseModel):
    description: str | None = None
    amount: Decimal | None = None
    category: str | None = None
    expense_date: datetime | None = None
    payment_method: str | None = None
    reference: str | None = None
    notes: str | None = None
    distribution_category: str | None = None


class ExpenseResponse(BaseModel):
    id: int
    description: str
    amount: Decimal
    category: str
    expense_date: datetime
    payment_method: str
    reference: str | None = None
    notes: str | None = None
    distribution_category: str = "costos"
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
