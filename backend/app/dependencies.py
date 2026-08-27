from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.utils.security import decode_access_token
from app.exceptions import UnauthorizedException, ForbiddenException

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = decode_access_token(token)
    if payload is None:
        raise UnauthorizedException("Token invalido o expirado")

    user_id: int | None = payload.get("sub")
    if user_id is None:
        raise UnauthorizedException("Token invalido")

    result = await db.execute(
        select(User).options(selectinload(User.role)).where(User.id == int(user_id))
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise UnauthorizedException("Usuario no encontrado")
    if not user.is_active:
        raise UnauthorizedException("Usuario desactivado")

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_active:
        raise UnauthorizedException("Usuario desactivado")
    return current_user


def require_superuser(
    current_user: User = Depends(get_current_active_user),
) -> User:
    if not current_user.is_superuser:
        raise ForbiddenException("Se requieren permisos de administrador")
    return current_user


def require_permission(permission_name: str):
    async def _check(
        current_user: User = Depends(get_current_active_user),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        if current_user.is_superuser:
            return current_user

        if current_user.role is None:
            raise ForbiddenException("No tiene un rol asignado")

        perm_names = [p.name for p in current_user.role.permissions]
        if permission_name not in perm_names:
            raise ForbiddenException(f"Permiso requerido: {permission_name}")

        return current_user

    return _check
