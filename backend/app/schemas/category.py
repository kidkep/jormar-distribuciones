from pydantic import BaseModel
from datetime import datetime


class CategoryBase(BaseModel):
    name: str
    description: str | None = None
    parent_id: int | None = None
    is_active: bool = True


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    parent_id: int | None = None
    is_active: bool | None = None


class CategoryResponse(CategoryBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UnitBase(BaseModel):
    name: str
    abbreviation: str
    is_active: bool = True


class UnitCreate(UnitBase):
    pass


class UnitResponse(UnitBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
