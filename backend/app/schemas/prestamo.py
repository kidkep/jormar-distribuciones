from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal


class PrestamoCreate(BaseModel):
    person_name: str
    amount: Decimal
    distribution_category: str = "utilidad"
    payment_method: str = "efectivo"
    description: str
    reference: str | None = None
    notes: str | None = None


class PrestamoPagoCreate(BaseModel):
    amount: Decimal
    payment_method: str = "efectivo"
    payment_date: str = ""
    notes: str | None = None


class PrestamoPagoResponse(BaseModel):
    id: int
    prestamo_id: int
    amount: Decimal
    payment_method: str
    payment_date: str
    notes: str | None = None
    user_name: str
    created_at: str | None = None

    model_config = {"from_attributes": True}


class PrestamoResponse(BaseModel):
    id: int
    person_name: str
    amount: Decimal
    remaining: Decimal
    distribution_category: str
    payment_method: str
    description: str
    status: str
    reference: str | None = None
    notes: str | None = None
    user_name: str
    total_pagado: Decimal
    pagos: list[PrestamoPagoResponse] = []
    created_at: str | None = None
    updated_at: str | None = None

    model_config = {"from_attributes": True}


class PrestamoResumen(BaseModel):
    total_prestado: Decimal
    total_pendiente: Decimal
    total_pagado: Decimal
    prestamos_activos: int
    prestamos_pagados: int
