from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal


class DistributionResponse(BaseModel):
    id: int
    sale_id: int
    sale_date: datetime
    sale_total: Decimal
    pct_utilidad: Decimal
    pct_gastos: Decimal
    pct_inversion: Decimal
    monto_utilidad: Decimal
    monto_gastos: Decimal
    monto_inversion: Decimal
    invoice_number: str
    client_name: str | None = None
    payment_method: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class DistributionSummary(BaseModel):
    total_ventas: Decimal
    total_utilidad: Decimal
    total_gastos: Decimal
    total_inversion: Decimal
    count_ventas: int
    pct_utilidad: Decimal
    pct_gastos: Decimal
    pct_inversion: Decimal


class DistributionConfig(BaseModel):
    pct_utilidad: Decimal
    pct_gastos: Decimal
    pct_inversion: Decimal
