from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.dependencies import require_permission
from app.models.user import User
from app.models.category import Category, Unit
from app.schemas.catalog import CategoryCreate, CategoryResponse, UnitCreate, UnitResponse
from app.schemas.common import MessageResponse
from app.exceptions import NotFoundException, ConflictException

router = APIRouter(prefix="/catalog", tags=["Catalogos"])


@router.get("/categories", response_model=list[CategoryResponse])
async def list_categories(db: AsyncSession = Depends(get_db), _user: User = Depends(require_permission("productos.view"))):
    result = await db.execute(select(Category).where(Category.is_active == True).order_by(Category.name))
    return list(result.scalars().all())


@router.post("/categories", response_model=CategoryResponse, status_code=201)
async def create_category(data: CategoryCreate, db: AsyncSession = Depends(get_db), _user: User = Depends(require_permission("productos.create"))):
    existing = await db.execute(select(Category).where(Category.name == data.name))
    if existing.scalar_one_or_none():
        raise ConflictException(f"Ya existe la categoría {data.name}")
    cat = Category(**data.model_dump())
    db.add(cat)
    await db.commit()
    await db.refresh(cat)
    return cat


@router.delete("/categories/{category_id}", response_model=MessageResponse)
async def delete_category(category_id: int, db: AsyncSession = Depends(get_db), _user: User = Depends(require_permission("productos.delete"))):
    result = await db.execute(select(Category).where(Category.id == category_id))
    cat = result.scalar_one_or_none()
    if not cat:
        raise NotFoundException("Categoría", category_id)
    cat.is_active = False
    await db.commit()
    return MessageResponse(message="Categoría desactivada")


@router.get("/units", response_model=list[UnitResponse])
async def list_units(db: AsyncSession = Depends(get_db), _user: User = Depends(require_permission("productos.view"))):
    result = await db.execute(select(Unit).where(Unit.is_active == True).order_by(Unit.name))
    return list(result.scalars().all())


@router.post("/units", response_model=UnitResponse, status_code=201)
async def create_unit(data: UnitCreate, db: AsyncSession = Depends(get_db), _user: User = Depends(require_permission("productos.create"))):
    existing = await db.execute(select(Unit).where(Unit.abbreviation == data.abbreviation))
    if existing.scalar_one_or_none():
        raise ConflictException(f"Ya existe la unidad {data.abbreviation}")
    unit = Unit(**data.model_dump())
    db.add(unit)
    await db.commit()
    await db.refresh(unit)
    return unit


@router.delete("/units/{unit_id}", response_model=MessageResponse)
async def delete_unit(unit_id: int, db: AsyncSession = Depends(get_db), _user: User = Depends(require_permission("productos.delete"))):
    result = await db.execute(select(Unit).where(Unit.id == unit_id))
    unit = result.scalar_one_or_none()
    if not unit:
        raise NotFoundException("Unidad", unit_id)
    unit.is_active = False
    await db.commit()
    return MessageResponse(message="Unidad desactivada")
