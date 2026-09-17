import os

from fastapi import APIRouter, Depends, File, Query, Response, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_permission, require_any_permission
from app.models.user import User
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse
from app.schemas.common import MessageResponse
from app.services.product_service import ProductService
from app.utils.audit import record_audit
from app.exceptions import BadRequestException, NotFoundException

router = APIRouter(prefix="/products", tags=["Productos"])

ALLOWED_MODEL_EXTENSIONS = {".glb", ".gltf"}
MAX_MODEL_SIZE = 25 * 1024 * 1024


@router.get("", response_model=list[ProductResponse])
async def list_products(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=1000),
    search: str = Query("", max_length=100),
    status: str = Query("all", pattern="^(all|active|inactive)$"),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("productos.view")),
):
    service = ProductService(db)
    skip = (page - 1) * size
    products, total = await service.get_products(skip, size, search, status)
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


@router.post("/{product_id}/toggle-status", response_model=ProductResponse)
async def toggle_product_status(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("productos.toggle_status")),
):
    service = ProductService(db)
    existing = await service.get_product(product_id)
    updated = await service.toggle_product_status(product_id)
    new_state = "activado" if updated.is_active else "desactivado"
    record_audit(
        db, _user, "update", "product",
        entity_id=product_id,
        old_values={"name": existing.name, "sku": existing.sku, "is_active": existing.is_active},
        new_values={"name": updated.name, "sku": updated.sku, "is_active": updated.is_active},
    )
    return updated


@router.post("/{product_id}/model")
async def upload_product_model(
    product_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("productos.edit")),
):
    filename = (file.filename or "").strip()
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_MODEL_EXTENSIONS:
        raise BadRequestException("Solo se permiten archivos .glb o .gltf")
    content = await file.read()
    if not content:
        raise BadRequestException("El archivo esta vacio")
    if len(content) > MAX_MODEL_SIZE:
        raise BadRequestException("El archivo supera el limite de 25 MB")
    content_type = "model/gltf-binary" if ext == ".glb" else "model/gltf+json"
    service = ProductService(db)
    model = await service.save_product_model(product_id, filename, content_type, content)
    record_audit(
        db, _user, "update", "product",
        entity_id=product_id,
        new_values={"model_file": model.filename, "model_size": model.size},
    )
    return {
        "product_id": product_id,
        "filename": model.filename,
        "size": model.size,
        "content_type": model.content_type,
        "model_url": f"/api/v1/products/{product_id}/model",
        "updated_at": model.updated_at,
    }


@router.get("/{product_id}/model")
async def download_product_model(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_any_permission("productos.view", "dotacion.view")),
):
    service = ProductService(db)
    model = await service.get_product_model(product_id)
    if model is None:
        raise NotFoundException("Modelo 3D", product_id)
    return Response(
        content=model.data,
        media_type=model.content_type or "model/gltf-binary",
        headers={
            "Content-Disposition": f'inline; filename="{model.filename}"',
            "Cache-Control": "private, max-age=3600",
        },
    )


@router.delete("/{product_id}/model", response_model=MessageResponse)
async def delete_product_model(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("productos.edit")),
):
    service = ProductService(db)
    await service.get_product(product_id)
    await service.delete_product_model(product_id)
    record_audit(
        db, _user, "update", "product",
        entity_id=product_id,
        new_values={"model_file": None},
    )
    return MessageResponse(message="Modelo 3D eliminado correctamente")
