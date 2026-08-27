from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal


class ClientBase(BaseModel):
    document_type: str = "CC"
    document_number: str
    name: str
    email: str | None = None
    phone: str | None = None
    address: str | None = None
    city: str | None = None
    credit_limit: Decimal = Decimal("0")
    notes: str | None = None
    is_active: bool = True


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    document_type: str | None = None
    document_number: str | None = None
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    address: str | None = None
    city: str | None = None
    credit_limit: Decimal | None = None
    notes: str | None = None
    is_active: bool | None = None


class ClientResponse(ClientBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
