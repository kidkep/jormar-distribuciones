from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
import io

from app.database import get_db
from app.dependencies import require_permission
from app.models.user import User
from app.schemas.quote import QuoteCreate, QuoteResponse
from app.schemas.common import MessageResponse
from app.services.quote_service import QuoteService
from app.utils.pdf_generator import generate_quote_pdf_bytes
from app.utils.audit import record_audit

router = APIRouter(prefix="/quotes", tags=["Cotizaciones"])


@router.get("", response_model=list[QuoteResponse])
async def list_quotes(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    search: str = Query("", max_length=100),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("cotizaciones.view")),
):
    service = QuoteService(db)
    skip = (page - 1) * size
    quotes, total = await service.get_quotes(skip, size, search)
    return quotes


@router.get("/download/{quote_id}")
async def download_quote(
    quote_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("cotizaciones.view")),
):
    service = QuoteService(db)
    quote = await service.get_quote(quote_id)
    pdf_bytes = generate_quote_pdf_bytes(quote)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={quote.quote_number}.pdf"},
    )


@router.get("/{quote_id}", response_model=QuoteResponse)
async def get_quote(
    quote_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("cotizaciones.view")),
):
    service = QuoteService(db)
    return await service.get_quote(quote_id)


@router.post("", response_model=QuoteResponse, status_code=201)
async def create_quote(
    data: QuoteCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("cotizaciones.create")),
):
    service = QuoteService(db)
    quote = await service.create_quote(data, user.id)
    record_audit(
        db, user, "create", "quote",
        entity_id=quote.id,
        new_values={"quote_number": getattr(quote, "quote_number", None), "total": str(getattr(quote, "total", ""))},
    )
    return quote


@router.put("/{quote_id}/status", response_model=QuoteResponse)
async def update_quote_status(
    quote_id: int,
    status: str,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("cotizaciones.edit")),
):
    service = QuoteService(db)
    quote = await service.get_quote(quote_id)
    updated = await service.update_status(quote_id, status)
    record_audit(
        db, _user, "update", "quote",
        entity_id=quote_id,
        old_values={"status": quote.status},
        new_values={"status": updated.status},
    )
    return updated


@router.delete("/{quote_id}", response_model=MessageResponse)
async def delete_quote(
    quote_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("cotizaciones.edit")),
):
    service = QuoteService(db)
    existing = await service.get_quote(quote_id)
    await service.delete_quote(quote_id)
    record_audit(
        db, _user, "delete", "quote",
        entity_id=quote_id,
        old_values={"quote_number": getattr(existing, "quote_number", None)},
    )
    return MessageResponse(message="Cotización eliminada correctamente")
