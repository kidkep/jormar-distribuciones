from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_permission
from app.models.user import User
from app.schemas.supplier import SupplierCreate, SupplierUpdate, SupplierResponse
from app.schemas.common import MessageResponse
from app.services.supplier_service import SupplierService

router = APIRouter(prefix="/suppliers", tags=["Proveedores"])


@router.get("", response_model=list[SupplierResponse])
async def list_suppliers(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    search: str = Query("", max_length=100),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("proveedores.view")),
):
    service = SupplierService(db)
    skip = (page - 1) * size
    suppliers, total = await service.get_suppliers(skip, size, search)
    return suppliers


@router.get("/{supplier_id}", response_model=SupplierResponse)
async def get_supplier(
    supplier_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("proveedores.view")),
):
    service = SupplierService(db)
    return await service.get_supplier(supplier_id)


@router.post("", response_model=SupplierResponse, status_code=201)
async def create_supplier(
    data: SupplierCreate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("proveedores.create")),
):
    service = SupplierService(db)
    return await service.create_supplier(data)


@router.put("/{supplier_id}", response_model=SupplierResponse)
async def update_supplier(
    supplier_id: int,
    data: SupplierUpdate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("proveedores.edit")),
):
    service = SupplierService(db)
    return await service.update_supplier(supplier_id, data)


@router.delete("/{supplier_id}", response_model=MessageResponse)
async def delete_supplier(
    supplier_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("proveedores.delete")),
):
    service = SupplierService(db)
    await service.delete_supplier(supplier_id)
    return MessageResponse(message="Proveedor desactivado correctamente")
