from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_permission
from app.models.user import User
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse
from app.schemas.common import MessageResponse
from app.services.product_service import ProductService
from app.utils.audit import record_audit

router = APIRouter(prefix="/products", tags=["Productos"])


@router.get("", response_model=list[ProductResponse])
async def list_products(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=1000),
    search: str = Query("", max_length=100),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("productos.view")),
):
    service = ProductService(db)
    skip = (page - 1) * size
    products, total = await service.get_products(skip, size, search)
    return products


@router.get("/low-stock", response_model=list[ProductResponse])
async def list_low_stock(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("productos.view")),
):
    service = ProductService(db)
    return await service.get_low_stock()


@router.get("/next-sku")
async def next_sku(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("productos.view")),
):
    service = ProductService(db)
    return {"next_sku": await service.next_sku()}


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("productos.view")),
):
    service = ProductService(db)
    return await service.get_product(product_id)


@router.post("", response_model=ProductResponse, status_code=201)
async def create_product(
    data: ProductCreate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("productos.create")),
):
    service = ProductService(db)
    product = await service.create_product(data)
    record_audit(
        db, _user, "create", "product",
        entity_id=product.id,
        new_values={"name": product.name, "sku": product.sku},
    )
    return product


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    data: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("productos.edit")),
):
    service = ProductService(db)
    existing = await service.get_product(product_id)
    old_values = {"name": existing.name, "sku": existing.sku}
    updated = await service.update_product(product_id, data)
    record_audit(
        db, _user, "update", "product",
        entity_id=product_id,
        old_values=old_values,
        new_values={"name": updated.name, "sku": updated.sku},
    )
    return updated


@router.delete("/{product_id}", response_model=MessageResponse)
async def delete_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("productos.delete")),
):
    service = ProductService(db)
    existing = await service.get_product(product_id)
    old_values = {"name": existing.name, "sku": existing.sku}
    await service.delete_product(product_id)
    record_audit(db, _user, "delete", "product", entity_id=product_id, old_values=old_values)
    return MessageResponse(message="Producto desactivado correctamente")
