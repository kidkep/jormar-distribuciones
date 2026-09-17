from pydantic import BaseModel, Field
from datetime import datetime


class ProductBrief(BaseModel):
    id: int
    name: str
    sku: str | None = None
    model_config = {"from_attributes": True}


class DotacionEmpresaCreate(BaseModel):
    name: str
    document: str | None = None
    phone: str | None = None
    contact_name: str | None = None
    address: str | None = None
    notes: str | None = None


class DotacionEmpresaUpdate(BaseModel):
    name: str | None = None
    document: str | None = None
    phone: str | None = None
    contact_name: str | None = None
    address: str | None = None
    notes: str | None = None


class DotacionEmpresaOut(BaseModel):
    id: int
    name: str
    document: str | None = None
    phone: str | None = None
    contact_name: str | None = None
    address: str | None = None
    notes: str | None = None
    employee_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DotacionPersonaCreate(BaseModel):
    full_name: str
    document: str | None = None
    company_id: int | None = None
    client_id: int | None = None
    position: str | None = None
    phone: str | None = None
    notes: str | None = None


class DotacionPersonaUpdate(BaseModel):
    full_name: str | None = None
    document: str | None = None
    company_id: int | None = None
    client_id: int | None = None
    position: str | None = None
    phone: str | None = None
    notes: str | None = None


class DotacionTallaOut(BaseModel):
    id: int
    persona_id: int
    product_id: int
    size: str
    color: str | None = None
    notes: str | None = None
    product: ProductBrief | None = None
    updated_at: datetime

    model_config = {"from_attributes": True}


class DotacionTallaUpsert(BaseModel):
    product_id: int
    size: str = Field(max_length=20)
    color: str | None = None
    notes: str | None = None


class DotacionHistorialOut(BaseModel):
    id: int
    persona_id: int
    product_id: int
    size: str
    color: str | None = None
    quantity: int = 1
    note: str | None = None
    dotacion_date: datetime
    product: ProductBrief | None = None

    model_config = {"from_attributes": True}


class DotacionHistorialCreate(BaseModel):
    product_id: int
    size: str = Field(max_length=20)
    color: str | None = None
    quantity: int = Field(default=1, ge=1)
    note: str | None = None
    dotacion_date: str | None = None


class DotacionPersonaOut(BaseModel):
    id: int
    full_name: str
    document: str | None = None
    company_id: int | None = None
    client_id: int | None = None
    position: str | None = None
    phone: str | None = None
    notes: str | None = None
    company_name: str | None = None
    tallas: list[DotacionTallaOut] = []
    historial: list[DotacionHistorialOut] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DotacionResumenItem(BaseModel):
    product_id: int
    product_name: str
    sku: str | None = None
    color: str | None = None
    size: str
    count: int


def parse_optional_date(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        try:
            return datetime.strptime(value, "%Y-%m-%d")
        except ValueError:
            return None