import os
from fastapi import APIRouter, Depends, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_permission
from app.models.user import User
from app.schemas.sale import SaleCreate, SaleResponse
from app.schemas.common import MessageResponse
from app.services.sale_service import SaleService
from app.utils.pdf_generator import INVOICES_DIR

router = APIRouter(prefix="/sales", tags=["Ventas"])


@router.get("", response_model=list[SaleResponse])
async def list_sales(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    search: str = Query("", max_length=100),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("ventas.view")),
):
    service = SaleService(db)
    skip = (page - 1) * size
    sales, total = await service.get_sales(skip, size, search)
    return sales


@router.get("/download/{invoice_number}")
async def download_invoice(
    invoice_number: str,
    _user: User = Depends(require_permission("ventas.view")),
):
    filename = f"{invoice_number}.pdf"
    filepath = os.path.join(INVOICES_DIR, filename)
    if not os.path.exists(filepath):
        from app.exceptions import NotFoundException
        raise NotFoundException("Factura", invoice_number)
    return FileResponse(
        path=filepath,
        filename=filename,
        media_type="application/pdf",
    )


@router.get("/{sale_id}", response_model=SaleResponse)
async def get_sale(
    sale_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("ventas.view")),
):
    service = SaleService(db)
    return await service.get_sale(sale_id)


@router.post("", response_model=SaleResponse, status_code=201)
async def create_sale(
    data: SaleCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("ventas.create")),
):
    service = SaleService(db)
    return await service.create_sale(data, user.id)


@router.post("/{sale_id}/cancel", response_model=MessageResponse)
async def cancel_sale(
    sale_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("ventas.anular")),
):
    service = SaleService(db)
    await service.cancel_sale(sale_id)
    return MessageResponse(message="Venta anulada correctamente")
