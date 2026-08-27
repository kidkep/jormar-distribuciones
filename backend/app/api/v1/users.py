from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_superuser
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.schemas.common import MessageResponse
from app.services.user_service import UserService
from app.utils.audit import record_audit

router = APIRouter(prefix="/users", tags=["Usuarios"])


@router.get("", response_model=list[UserResponse])
async def list_users(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_superuser),
):
    service = UserService(db)
    skip = (page - 1) * size
    users, total = await service.get_users(skip, size)
    return users


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_superuser),
):
    service = UserService(db)
    return await service.get_user(user_id)


@router.post("", response_model=UserResponse, status_code=201)
async def create_user(
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_superuser),
):
    service = UserService(db)
    user = await service.create_user(data)
    record_audit(
        db, _admin, "create", "user",
        entity_id=user.id,
        new_values={
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "is_active": user.is_active,
            "is_superuser": user.is_superuser,
            "role_id": user.role_id,
        },
    )
    return user


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_superuser),
):
    service = UserService(db)
    existing = await service.get_user(user_id)
    old_values = {
        "username": existing.username,
        "email": existing.email,
        "full_name": existing.full_name,
        "is_active": existing.is_active,
        "is_superuser": existing.is_superuser,
        "role_id": existing.role_id,
    }
    updated = await service.update_user(user_id, data)
    record_audit(
        db, _admin, "update", "user",
        entity_id=user_id,
        old_values=old_values,
        new_values={
            "username": updated.username,
            "email": updated.email,
            "full_name": updated.full_name,
            "is_active": updated.is_active,
            "is_superuser": updated.is_superuser,
            "role_id": updated.role_id,
        },
    )
    return updated


@router.delete("", response_model=MessageResponse)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_superuser),
):
    service = UserService(db)
    existing = await service.get_user(user_id)
    old_values = {
        "username": existing.username,
        "email": existing.email,
        "full_name": existing.full_name,
        "role_id": existing.role_id,
    }
    await service.delete_user(user_id)
    record_audit(
        db, _admin, "delete", "user",
        entity_id=user_id,
        old_values=old_values,
    )
    return MessageResponse(message="Usuario eliminado correctamente")


@router.post("/reset-data", response_model=MessageResponse)
async def reset_data(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_superuser),
):
    """VACIA todos los datos de negocio y auditoria. Conserva admin, roles, permisos y categorias."""
    tables = [
        "sale_items", "payments", "sales",
        "quote_items", "quotes",
        "products", "clients", "suppliers",
        "expenses", "retiros", "sale_distributions",
        "audit_logs",
    ]
    for t in tables:
        await db.execute(text(f'TRUNCATE TABLE "{t}" RESTART IDENTITY CASCADE'))
    await db.commit()
    return MessageResponse(message="Datos de negocio borrados correctamente")
