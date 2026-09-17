from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import require_permission
from app.models.user import User
from app.models.dotacion import DotacionEmpresa, DotacionPersona, DotacionTalla, DotacionHistorial
from app.models.product import Product
from app.schemas.dotacion import (
    DotacionEmpresaCreate,
    DotacionEmpresaUpdate,
    DotacionEmpresaOut,
    DotacionPersonaCreate,
    DotacionPersonaUpdate,
    DotacionPersonaOut,
    DotacionTallaUpsert,
    DotacionTallaOut,
    DotacionHistorialCreate,
    DotacionHistorialOut,
    DotacionResumenItem,
    parse_optional_date,
)
from app.exceptions import NotFoundException, BadRequestException
from app.utils.audit import record_audit
from app.utils.garments import LAYERS, resolve_product_fit
from app.models.product_model import ProductModel

router = APIRouter(prefix="/dotacion", tags=["Tallas y Dotacion"])


def _persona_query():
    return select(DotacionPersona).options(
        selectinload(DotacionPersona.company),
        selectinload(DotacionPersona.tallas).selectinload(DotacionTalla.product),
        selectinload(DotacionPersona.historial).selectinload(DotacionHistorial.product),
    )


async def _load_persona(db: AsyncSession, persona_id: int) -> DotacionPersona:
    result = await db.execute(_persona_query().where(DotacionPersona.id == persona_id))
    persona = result.unique().scalar_one_or_none()
    if not persona:
        raise NotFoundException("Persona", persona_id)
    return persona


async def _load_empresa(db: AsyncSession, empresa_id: int) -> DotacionEmpresa:
    result = await db.execute(
        select(DotacionEmpresa)
        .options(selectinload(DotacionEmpresa.personas))
        .where(DotacionEmpresa.id == empresa_id)
    )
    empresa = result.unique().scalar_one_or_none()
    if not empresa:
        raise NotFoundException("Empresa", empresa_id)
    return empresa


def _persona_to_out(persona: DotacionPersona) -> dict:
    return {
        "id": persona.id,
        "full_name": persona.full_name,
        "document": persona.document,
        "company_id": persona.company_id,
        "client_id": persona.client_id,
        "position": persona.position,
        "phone": persona.phone,
        "notes": persona.notes,
        "company_name": persona.company.name if persona.company else None,
        "tallas": [DotacionTallaOut.model_validate(t).model_dump(mode="json") for t in persona.tallas],
        "historial": [
            DotacionHistorialOut.model_validate(h).model_dump(mode="json")
            for h in persona.historial
        ],
        "created_at": persona.created_at,
        "updated_at": persona.updated_at,
    }


# ================================ EMPRESAS ================================

@router.get("/empresas", response_model=list[DotacionEmpresaOut])
async def list_empresas(
    search: str = Query("", max_length=100),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("dotacion.view")),
):
    result = await db.execute(
        select(DotacionEmpresa)
        .options(selectinload(DotacionEmpresa.personas))
        .where(DotacionEmpresa.name.ilike(f"%{search}%"))
        .order_by(DotacionEmpresa.name)
    )
    empresas = result.unique().scalars().all()
    return [
        DotacionEmpresaOut.model_validate(e, update={"employee_count": len(e.personas)})
        for e in empresas
    ]


@router.post("/empresas", response_model=DotacionEmpresaOut, status_code=201)
async def create_empresa(
    data: DotacionEmpresaCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("dotacion.create")),
):
    empresa = DotacionEmpresa(
        name=data.name,
        document=data.document,
        phone=data.phone,
        contact_name=data.contact_name,
        address=data.address,
        notes=data.notes,
    )
    db.add(empresa)
    await db.flush()
    record_audit(db, user, "create", "dotacion_empresa", entity_id=empresa.id, new_values={"name": empresa.name})
    await db.commit()
    return DotacionEmpresaOut.model_validate(empresa, update={"employee_count": 0})


@router.put("/empresas/{empresa_id}", response_model=DotacionEmpresaOut)
async def update_empresa(
    empresa_id: int,
    data: DotacionEmpresaUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("dotacion.edit")),
):
    empresa = await _load_empresa(db, empresa_id)
    old = {"name": empresa.name}
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(empresa, field, value)
    record_audit(db, user, "update", "dotacion_empresa", entity_id=empresa_id, old_values=old, new_values={"name": empresa.name})
    await db.commit()
    return DotacionEmpresaOut.model_validate(empresa, update={"employee_count": len(empresa.personas)})


@router.delete("/empresas/{empresa_id}")
async def delete_empresa(
    empresa_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("dotacion.delete")),
):
    empresa = await _load_empresa(db, empresa_id)
    record_audit(db, user, "delete", "dotacion_empresa", entity_id=empresa_id, old_values={"name": empresa.name})
    await db.delete(empresa)
    await db.commit()
    return {"message": "Empresa eliminada"}


@router.get("/empresas/{empresa_id}/resumen", response_model=list[DotacionResumenItem])
async def resumen_empresa(
    empresa_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("dotacion.view")),
):
    """Resumen de dotacion por producto y talla para todos los empleados."""
    empresa = await _load_empresa(db, empresa_id)
    if not empresa.personas:
        return []
    persona_ids = [p.id for p in empresa.personas]
    result = await db.execute(
        select(DotacionTalla.product_id, DotacionTalla.size, DotacionTalla.color, func.count(DotacionTalla.id))
        .where(DotacionTalla.persona_id.in_(persona_ids))
        .group_by(DotacionTalla.product_id, DotacionTalla.size, DotacionTalla.color)
    )
    rows = result.all()
    out = []
    for product_id, size, color, count in rows:
        p = await db.get(Product, product_id)
        out.append(DotacionResumenItem(
            product_id=product_id,
            product_name=p.name if p else f"Producto #{product_id}",
            sku=p.sku if p else None,
            color=color,
            size=size,
            count=int(count),
        ))
    out.sort(key=lambda r: (r.product_name or "", r.color or "", r.size))
    return out


# ================================ PERSONAS ================================

@router.get("/personas", response_model=list[DotacionPersonaOut])
async def list_personas(
    tipo: str = Query("personal", max_length=10),
    search: str = Query("", max_length=100),
    company_id: int | None = Query(None, ge=1),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("dotacion.view")),
):
    query = _persona_query()
    if company_id is not None:
        query = query.where(DotacionPersona.company_id == company_id)
    elif tipo == "personal":
        query = query.where(DotacionPersona.company_id.is_(None))
    elif tipo == "empresa":
        query = query.where(DotacionPersona.company_id.isnot(None))
    if search:
        query = query.where(DotacionPersona.full_name.ilike(f"%{search}%"))
    result = await db.execute(query.order_by(DotacionPersona.full_name))
    personas = result.unique().scalars().all()
    return [_persona_to_out(p) for p in personas]


@router.post("/personas", response_model=DotacionPersonaOut, status_code=201)
async def create_persona(
    data: DotacionPersonaCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("dotacion.create")),
):
    persona = DotacionPersona(**data.model_dump())
    db.add(persona)
    await db.flush()
    record_audit(db, user, "create", "dotacion_persona", entity_id=persona.id, new_values={"full_name": persona.full_name})
    await db.commit()
    return await _load_persona_response(db, persona.id)


async def _load_persona_response(db: AsyncSession, persona_id: int) -> dict:
    persona = await _load_persona(db, persona_id)
    return _persona_to_out(persona)


@router.get("/personas/{persona_id}", response_model=DotacionPersonaOut)
async def get_persona(
    persona_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("dotacion.view")),
):
    return _persona_to_out(await _load_persona(db, persona_id))


@router.put("/personas/{persona_id}", response_model=DotacionPersonaOut)
async def update_persona(
    persona_id: int,
    data: DotacionPersonaUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("dotacion.edit")),
):
    persona = await _load_persona(db, persona_id)
    old = {"full_name": persona.full_name, "company_id": persona.company_id}
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(persona, field, value)
    record_audit(db, user, "update", "dotacion_persona", entity_id=persona_id, old_values=old, new_values={"full_name": persona.full_name})
    await db.commit()
    return _persona_to_out(persona)


@router.delete("/personas/{persona_id}")
async def delete_persona(
    persona_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("dotacion.delete")),
):
    persona = await _load_persona(db, persona_id)
    record_audit(db, user, "delete", "dotacion_persona", entity_id=persona_id, old_values={"full_name": persona.full_name})
    await db.delete(persona)
    await db.commit()
    return {"message": "Persona eliminada"}


# ================================ TALLAS ================================

@router.post("/personas/{persona_id}/tallas", response_model=DotacionTallaOut, status_code=201)
async def upsert_talla(
    persona_id: int,
    data: DotacionTallaUpsert,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("dotacion.edit")),
):
    await _load_persona(db, persona_id)
    product = await db.get(Product, data.product_id)
    if not product:
        raise NotFoundException("Producto", data.product_id)

    result = await db.execute(
        select(DotacionTalla).where(
            DotacionTalla.persona_id == persona_id,
            DotacionTalla.product_id == data.product_id,
        )
    )
    talla = result.scalar_one_or_none()
    old = None
    if talla:
        old = {"size": talla.size, "color": talla.color}
        talla.size = data.size
        talla.color = data.color
        talla.notes = data.notes
    else:
        talla = DotacionTalla(
            persona_id=persona_id,
            product_id=data.product_id,
            size=data.size,
            color=data.color,
            notes=data.notes,
        )
        db.add(talla)

    historial = DotacionHistorial(
        persona_id=persona_id,
        product_id=data.product_id,
        size=data.size,
        color=data.color,
        quantity=1,
        note=data.notes,
    )
    db.add(historial)
    await db.flush()
    record_audit(
        db, user, "create" if not old else "update", "dotacion_talla",
        entity_id=talla.id,
        old_values=old,
        new_values={"product_id": data.product_id, "size": data.size, "color": data.color},
    )
    await db.commit()
    await db.refresh(talla)
    reloaded = await db.execute(
        select(DotacionTalla).options(selectinload(DotacionTalla.product)).where(DotacionTalla.id == talla.id)
    )
    return reloaded.scalar_one()


@router.delete("/personas/{persona_id}/tallas/{talla_id}")
async def delete_talla(
    persona_id: int,
    talla_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("dotacion.edit")),
):
    result = await db.execute(
        select(DotacionTalla).where(DotacionTalla.id == talla_id, DotacionTalla.persona_id == persona_id)
    )
    talla = result.scalar_one_or_none()
    if not talla:
        raise NotFoundException("Talla", talla_id)
    record_audit(db, user, "delete", "dotacion_talla", entity_id=talla_id, old_values={"size": talla.size})
    await db.delete(talla)
    await db.commit()
    return {"message": "Talla eliminada"}


# ================================ HISTORIAL ================================

@router.get("/personas/{persona_id}/historial", response_model=list[DotacionHistorialOut])
async def get_historial(
    persona_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("dotacion.view")),
):
    await _load_persona(db, persona_id)
    result = await db.execute(
        select(DotacionHistorial)
        .options(selectinload(DotacionHistorial.product))
        .where(DotacionHistorial.persona_id == persona_id)
        .order_by(DotacionHistorial.dotacion_date.desc())
    )
    return result.scalars().all()


@router.post("/personas/{persona_id}/historial", response_model=DotacionHistorialOut, status_code=201)
async def add_historial(
    persona_id: int,
    data: DotacionHistorialCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("dotacion.create")),
):
    await _load_persona(db, persona_id)
    product = await db.get(Product, data.product_id)
    if not product:
        raise NotFoundException("Producto", data.product_id)

    fecha = parse_optional_date(data.dotacion_date)
    historial = DotacionHistorial(
        persona_id=persona_id,
        product_id=data.product_id,
        size=data.size,
        color=data.color,
        quantity=data.quantity,
        note=data.note,
        dotacion_date=fecha,
    )
    db.add(historial)
    await db.flush()
    record_audit(
        db, user, "create", "dotacion_historial",
        entity_id=historial.id,
        new_values={"product_id": data.product_id, "size": data.size, "quantity": data.quantity},
    )
    await db.commit()
    await db.refresh(historial)
    reloaded = await db.execute(
        select(DotacionHistorial).options(selectinload(DotacionHistorial.product)).where(DotacionHistorial.id == historial.id)
    )
    return reloaded.scalar_one()


# ================================ CATALOGO ================================

@router.get("/catalogo")
async def get_catalogo(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("dotacion.view")),
):
    """Prendas disponibles en el inventario con su capa, genero y tallas."""
    result = await db.execute(
        select(Product).where(Product.is_active == True).order_by(Product.name)  # noqa: E712
    )
    products = result.scalars().all()
    model_result = await db.execute(select(ProductModel.product_id))
    uploaded_models = {row[0] for row in model_result.all()}
    items = []
    for p in products:
        fit = resolve_product_fit(p)
        has_model = bool(p.model_url) or p.id in uploaded_models
        model_url = p.model_url or (f"/api/v1/products/{p.id}/model" if p.id in uploaded_models else None)
        items.append({
            "id": p.id,
            "name": p.name,
            "sku": p.sku,
            "sale_price": float(p.sale_price),
            "garment_type": fit["garment_type"],
            "layer": fit["layer"],
            "gender": fit["gender"],
            "sizes": fit["sizes"],
            "size_class": fit["size_class"],
            "model_url": model_url,
            "has_model": has_model,
        })
    return {
        "products": items,
        "layers": LAYERS,
        "colors": [
            "Negro", "Blanco", "Gris", "Azul", "Rojo", "Verde", "Amarillo",
            "Naranja", "Cafe", "Beige", "Vino", "Cielo", "Tony", "Petroleo",
            "Fucsia", "Morado",
        ],
    }