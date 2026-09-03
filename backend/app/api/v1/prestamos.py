from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_permission
from app.models.user import User
from app.schemas.prestamo import (
    PrestamoCreate, PrestamoPagoCreate,
    PrestamoResponse, PrestamoPagoResponse, PrestamoResumen,
)
from app.schemas.common import MessageResponse
from app.services.prestamo_service import PrestamoService
from app.utils.audit import record_audit

router = APIRouter(prefix="/prestamos", tags=["Prestamos"])


def _prestamo_to_response(p) -> dict:
    total_pagado = float(p.amount) - float(p.remaining)
    pagos_out = []
    for pg in p.pagos:
        user_name = pg.user.username if pg.user else "Desconocido"
        pagos_out.append({
            "id": pg.id,
            "prestamo_id": pg.prestamo_id,
            "amount": float(pg.amount),
            "payment_method": pg.payment_method,
            "payment_date": pg.payment_date.strftime("%Y-%m-%d") if pg.payment_date else "",
            "notes": pg.notes,
            "user_name": user_name,
            "created_at": pg.created_at.strftime("%Y-%m-%d %H:%M") if pg.created_at else None,
        })
    return {
        "id": p.id,
        "person_name": p.person_name,
        "amount": float(p.amount),
        "remaining": float(p.remaining),
        "distribution_category": p.distribution_category,
        "payment_method": p.payment_method,
        "description": p.description,
        "status": p.status,
        "reference": p.reference,
        "notes": p.notes,
        "user_name": p.user.username if p.user else "Desconocido",
        "total_pagado": round(total_pagado, 2),
        "pagos": pagos_out,
        "created_at": p.created_at.strftime("%Y-%m-%d %H:%M") if p.created_at else None,
        "updated_at": p.updated_at.strftime("%Y-%m-%d %H:%M") if p.updated_at else None,
    }


@router.get("")
async def list_prestamos(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    search: str = Query("", max_length=100),
    status: str = Query("", max_length=20),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("finanzas.view")),
):
    service = PrestamoService(db)
    skip = (page - 1) * size
    prestamos, total = await service.get_prestamos(skip, size, search, status)
    return [_prestamo_to_response(p) for p in prestamos]


@router.get("/resumen")
async def get_prestamos_resumen(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("finanzas.view")),
):
    service = PrestamoService(db)
    return await service.get_resumen()


@router.get("/{prestamo_id}")
async def get_prestamo(
    prestamo_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("finanzas.view")),
):
    service = PrestamoService(db)
    p = await service.get_prestamo(prestamo_id)
    return _prestamo_to_response(p)


@router.post("", status_code=201)
async def create_prestamo(
    data: PrestamoCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("finanzas.prestamos")),
):
    service = PrestamoService(db)
    prestamo = await service.create_prestamo(data, user.id)
    record_audit(
        db, user, "create", "prestamo",
        entity_id=prestamo.id,
        new_values={
            "person_name": prestamo.person_name,
            "amount": str(prestamo.amount),
            "category": prestamo.distribution_category,
        },
    )
    return _prestamo_to_response(prestamo)


@router.post("/{prestamo_id}/pagos", status_code=201)
async def registrar_pago(
    prestamo_id: int,
    data: PrestamoPagoCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("finanzas.prestamos")),
):
    service = PrestamoService(db)
    pago = await service.registrar_pago(prestamo_id, data, user.id)
    record_audit(
        db, user, "create", "prestamo_pago",
        entity_id=pago.id,
        new_values={
            "prestamo_id": str(pago.prestamo_id),
            "amount": str(pago.amount),
            "payment_method": pago.payment_method,
        },
    )
    return {
        "message": "Pago registrado correctamente",
        "pago_id": pago.id,
    }


@router.delete("/{prestamo_id}")
async def delete_prestamo(
    prestamo_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("finanzas.prestamos")),
):
    service = PrestamoService(db)
    prestamo = await service.get_prestamo(prestamo_id)
    record_audit(
        db, user, "delete", "prestamo",
        entity_id=prestamo.id,
        old_values={
            "person_name": prestamo.person_name,
            "amount": str(prestamo.amount),
        },
    )
    await service.delete_prestamo(prestamo_id)
    return MessageResponse(message="Prestamo eliminado correctamente")
