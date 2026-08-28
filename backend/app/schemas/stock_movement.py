from pydantic import BaseModel, Field
from datetime import datetime
from decimal import Decimal


class StockAdjustCreate(BaseModel):
    product_id: int
    quantity: int = Field(ge=1)
    adjustment_type: str = Field(description="entrada o salida")
    reason: str | None = None


class StockMovementResponse(BaseModel):
    id: int
    product_id: int
    product_name: str | None = None
    user_id: int
    movement_type: str
    quantity: int
    stock_before: int
    stock_after: int
    reason: str | None = None
    movement_date: datetime
    created_at: datetime

    model_config = {"from_attributes": True}
