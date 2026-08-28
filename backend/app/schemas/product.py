from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal


class ProductBase(BaseModel):
    sku: str = ""
    barcode: str | None = None
    name: str
    description: str | None = None
    category_id: int | None = None
    unit_id: int | None = None
    supplier_id: int | None = None
    purchase_price: Decimal = Decimal("0")
    sale_price: Decimal = Decimal("0")
    tax_rate: Decimal = Decimal("0")
    min_stock: int = 0
    current_stock: int = 0
    is_active: bool = True


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    sku: str | None = None
    barcode: str | None = None
    name: str | None = None
    description: str | None = None
    category_id: int | None = None
    unit_id: int | None = None
    supplier_id: int | None = None
    purchase_price: Decimal | None = None
    sale_price: Decimal | None = None
    tax_rate: Decimal | None = None
    min_stock: int | None = None
    current_stock: int | None = None
    is_active: bool | None = None


class CategoryBrief(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class UnitBrief(BaseModel):
    id: int
    name: str
    abbreviation: str

    model_config = {"from_attributes": True}


class SupplierBrief(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class ProductResponse(ProductBase):
    id: int
    category: CategoryBrief | None = None
    unit: UnitBrief | None = None
    supplier: SupplierBrief | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
