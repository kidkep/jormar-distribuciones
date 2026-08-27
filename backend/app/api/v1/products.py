from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_permission
from app.models.user import User
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse
from app.schemas.common import MessageResponse
from app.services.product_service import ProductService

router = APIRouter(prefix="/products", tags=["Productos"])


@router.get("", response_model=list[ProductResponse])
async def list_products(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
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
    return await service.create_product(data)


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    data: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("productos.edit")),
):
    service = ProductService(db)
    return await service.update_product(product_id, data)


@router.delete("/{product_id}", response_model=MessageResponse)
async def delete_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("productos.delete")),
):
    service = ProductService(db)
    await service.delete_product(product_id)
    return MessageResponse(message="Producto desactivado correctamente")
