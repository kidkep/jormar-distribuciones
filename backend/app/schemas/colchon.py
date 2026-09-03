from pydantic import BaseModel, Field
from datetime import datetime
from decimal import Decimal


class ColchonMontoUpdate(BaseModel):
    monto_base: Decimal = Field(gt=0)


class ColchonPrestamoCreate(BaseModel):
    person_name: str
    amount: Decimal = Field(gt=0)
    payment_method: str = "efectivo"
    description: str
    notes: str | None = None


class ColchonPagoCreate(BaseModel):
    amount: Decimal = Field(gt=0)
    payment_method: str = "efectivo"
    payment_date: str = ""
    notes: str | None = None


class ColchonPagoResponse(BaseModel):
    id: int
    colchon_prestamo_id: int
    amount: Decimal
    payment_method: str
    payment_date: str
    notes: str | None = None
    user_name: str
    created_at: str | None = None

    model_config = {"from_attributes": True}


class ColchonPrestamoResponse(BaseModel):
    id: int
    person_name: str
    amount: Decimal
    remaining: Decimal
    payment_method: str
    description: str
    status: str
    notes: str | None = None
    user_name: str
    total_pagado: Decimal
    pagos: list[ColchonPagoResponse] = []
    created_at: str | None = None
    updated_at: str | None = None

    model_config = {"from_attributes": True}


class ColchonResumen(BaseModel):
    monto_base: Decimal
    saldo_disponible: Decimal
    total_prestado: Decimal
    total_pendiente: Decimal
    total_pagado: Decimal
    prestamos_activos: int
    prestamos_pagados: int
