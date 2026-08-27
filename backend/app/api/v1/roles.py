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
    return await repo.create(role)


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

    if data.name is not None:
        role.name = data.name
    if data.description is not None:
        role.description = data.description
    if data.permission_ids is not None:
        role.permissions = await repo.get_permissions_by_ids(data.permission_ids)

    return await repo.update(role)


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
    await repo.delete(role)
    return MessageResponse(message="Rol eliminado correctamente")
