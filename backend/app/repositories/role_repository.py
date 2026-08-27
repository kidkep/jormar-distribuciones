from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.role import Role
from app.models.permission import Permission


class RoleRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, role_id: int) -> Role | None:
        result = await self.db.execute(
            select(Role).options(selectinload(Role.permissions)).where(Role.id == role_id)
        )
        return result.scalar_one_or_none()

    async def get_by_name(self, name: str) -> Role | None:
        result = await self.db.execute(select(Role).where(Role.name == name))
        return result.scalar_one_or_none()

    async def get_all(self) -> list[Role]:
        result = await self.db.execute(
            select(Role).options(selectinload(Role.permissions)).order_by(Role.id)
        )
        return list(result.scalars().all())

    async def create(self, role: Role) -> Role:
        self.db.add(role)
        await self.db.flush()
        return await self.get_by_id(role.id)

    async def update(self, role: Role) -> Role:
        await self.db.flush()
        return await self.get_by_id(role.id)

    async def delete(self, role: Role) -> None:
        await self.db.delete(role)
        await self.db.flush()

    async def get_permissions(self) -> list[Permission]:
        result = await self.db.execute(select(Permission).order_by(Permission.module, Permission.name))
        return list(result.scalars().all())

    async def get_permissions_by_ids(self, ids: list[int]) -> list[Permission]:
        result = await self.db.execute(select(Permission).where(Permission.id.in_(ids)))
        return list(result.scalars().all())
