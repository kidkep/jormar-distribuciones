from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_permission, require_superuser
from app.models.user import User
from app.schemas.colchon import (
    ColchonMontoUpdate, ColchonPrestamoCreate, ColchonPagoCreate,
    ColchonPrestamoResponse, ColchonPagoResponse, ColchonResumen,
)
from app.schemas.common import MessageResponse
from app.services.colchon_service import ColchonService
from app.utils.audit import record_audit

router = APIRouter(prefix="/colchon", tags=["Colchon Financiero"])


def _prestamo_to_response(p) -> dict:
    total_pagado = float(p.amount) - float(p.remaining)
    pagos_out = []
    for pg in p.pagos:
        user_name = pg.user.username if pg.user else "Desconocido"
        pagos_out.append({
            "id": pg.id,
            "colchon_prestamo_id": pg.colchon_prestamo_id,
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
        "payment_method": p.payment_method,
        "description": p.description,
        "status": p.status,
        "notes": p.notes,
        "user_name": p.user.username if p.user else "Desconocido",
        "total_pagado": round(total_pagado, 2),
        "pagos": pagos_out,
        "created_at": p.created_at.strftime("%Y-%m-%d %H:%M") if p.created_at else None,
        "updated_at": p.updated_at.strftime("%Y-%m-%d %H:%M") if p.updated_at else None,
    }


@router.get("/config")
async def get_config(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("finanzas.colchon")),
):
    service = ColchonService(db)
    config = await service.get_config()
    return {"monto_base": float(config.monto_base)}


@router.put("/config")
async def update_monto_base(
    data: ColchonMontoUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_superuser),
):
    service = ColchonService(db)
    config = await service.update_monto_base(data)
    record_audit(
        db, user, "update", "colchon_config",
        entity_id=config.id,
        new_values={"monto_base": str(config.monto_base)},
    )
    return {"message": "Monto base del colchon actualizado", "monto_base": float(config.monto_base)}


@router.get("/resumen", response_model=ColchonResumen)
async def get_resumen(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("finanzas.colchon")),
):
    service = ColchonService(db)
    return await service.get_resumen()


@router.get("")
async def list_prestamos(
    search: str = Query("", max_length=100),
    status: str = Query("", max_length=20),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("finanzas.colchon")),
):
    service = ColchonService(db)
    prestamos = await service.get_prestamos(search, status)
    return [_prestamo_to_response(p) for p in prestamos]


@router.get("/{prestamo_id}")
async def get_prestamo(
    prestamo_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("finanzas.colchon")),
):
    service = ColchonService(db)
    p = await service.get_prestamo(prestamo_id)
    return _prestamo_to_response(p)


@router.post("", status_code=201)
async def create_prestamo(
    data: ColchonPrestamoCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("finanzas.colchon")),
):
    service = ColchonService(db)
    created = await service.create_prestamo(data, user.id)
    prestamo = await service.get_prestamo(created.id)
    record_audit(
        db, user, "create", "colchon_prestamo",
        entity_id=prestamo.id,
        new_values={
            "person_name": prestamo.person_name,
            "amount": str(prestamo.amount),
        },
    )
    return _prestamo_to_response(prestamo)


@router.post("/{prestamo_id}/pagos", status_code=201)
async def registrar_pago(
    prestamo_id: int,
    data: ColchonPagoCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("finanzas.colchon")),
):
    service = ColchonService(db)
    pago = await service.registrar_pago(prestamo_id, data, user.id)
    record_audit(
        db, user, "create", "colchon_pago",
        entity_id=pago.id,
        new_values={
            "colchon_prestamo_id": str(pago.colchon_prestamo_id),
            "amount": str(pago.amount),
            "payment_method": pago.payment_method,
        },
    )
    return {
        "message": "Abono registrado correctamente",
        "pago_id": pago.id,
    }


@router.delete("/{prestamo_id}")
async def delete_prestamo(
    prestamo_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("finanzas.colchon")),
):
    service = ColchonService(db)
    prestamo = await service.get_prestamo(prestamo_id)
    record_audit(
        db, user, "delete", "colchon_prestamo",
        entity_id=prestamo.id,
        old_values={"person_name": prestamo.person_name, "amount": str(prestamo.amount)},
    )
    await service.delete_prestamo(prestamo_id)
    return MessageResponse(message="Prestamo del colchon eliminado correctamente")
