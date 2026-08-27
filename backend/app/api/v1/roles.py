from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_superuser
from app.models.user import User
from app.models.role import Role
from app.schemas.role import RoleCreate, RoleUpdate, RoleResponse, PermissionResponse
from app.schemas.common import MessageResponse
from app.repositories.role_repository import RoleRepository
from app.exceptions import NotFoundException, ConflictException
from app.utils.audit import record_audit

router = APIRouter(prefix="/roles", tags=["Roles y Permisos"])


@router.get("", response_model=list[RoleResponse])
async def list_roles(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_superuser),
):
    repo = RoleRepository(db)
    return await repo.get_all()


@router.get("/permissions/all", response_model=list[PermissionResponse])
async def list_permissions(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_superuser),
):
    repo = RoleRepository(db)
    return await repo.get_permissions()


@router.get("/{role_id}", response_model=RoleResponse)
async def get_role(
    role_id: int,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_superuser),
):
    repo = RoleRepository(db)
    role = await repo.get_by_id(role_id)
    if not role:
        raise NotFoundException("Rol", role_id)
    return role


@router.post("", response_model=RoleResponse, status_code=201)
async def create_role(
    data: RoleCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_superuser),
):
    repo = RoleRepository(db)
    if await repo.get_by_name(data.name):
        raise ConflictException("Ya existe un rol con ese nombre")

    role = Role(name=data.name, description=data.description)
    if data.permission_ids:
        role.permissions = await repo.get_permissions_by_ids(data.permission_ids)
    created = await repo.create(role)
    record_audit(
        db, _admin, "create", "role",
        entity_id=created.id,
        new_values={
            "name": created.name,
            "description": created.description,
            "permission_ids": data.permission_ids,
        },
    )
    return created


@router.put("/{role_id}", response_model=RoleResponse)
async def update_role(
    role_id: int,
    data: RoleUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_superuser),
):
    repo = RoleRepository(db)
    role = await repo.get_by_id(role_id)
    if not role:
        raise NotFoundException("Rol", role_id)

    old_values = {
        "name": role.name,
        "description": role.description,
        "permission_ids": [p.id for p in role.permissions],
    }

    if data.name is not None:
        role.name = data.name
    if data.description is not None:
        role.description = data.description
    if data.permission_ids is not None:
        role.permissions = await repo.get_permissions_by_ids(data.permission_ids)

    updated = await repo.update(role)
    record_audit(
        db, _admin, "update", "role",
        entity_id=role_id,
        old_values=old_values,
        new_values={
            "name": updated.name,
            "description": updated.description,
            "permission_ids": [p.id for p in updated.permissions],
        },
    )
    return updated


@router.delete("/{role_id}", response_model=MessageResponse)
async def delete_role(
    role_id: int,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_superuser),
):
    repo = RoleRepository(db)
    role = await repo.get_by_id(role_id)
    if not role:
        raise NotFoundException("Rol", role_id)
    old_values = {"name": role.name, "permission_ids": [p.id for p in role.permissions]}
    await repo.delete(role)
    record_audit(db, _admin, "delete", "role", entity_id=role_id, old_values=old_values)
    return MessageResponse(message="Rol eliminado correctamente")
