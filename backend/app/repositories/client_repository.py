from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.client import Client


class ClientRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, client_id: int) -> Client | None:
        result = await self.db.execute(select(Client).where(Client.id == client_id))
        return result.scalar_one_or_none()

    async def get_by_document(self, document_number: str) -> Client | None:
        result = await self.db.execute(select(Client).where(Client.document_number == document_number))
        return result.scalar_one_or_none()

    async def get_all(self, skip: int = 0, limit: int = 50, search: str = "") -> tuple[list[Client], int]:
        query = select(Client).where(Client.is_active == True)
        count_query = select(func.count(Client.id)).where(Client.is_active == True)

        if search:
            filter_condition = (
                Client.name.ilike(f"%{search}%")
                | Client.document_number.ilike(f"%{search}%")
                | Client.phone.ilike(f"%{search}%")
            )
            query = query.where(filter_condition)
            count_query = count_query.where(filter_condition)

        count_result = await self.db.execute(count_query)
        total = count_result.scalar()

        result = await self.db.execute(query.offset(skip).limit(limit).order_by(Client.id))
        return list(result.scalars().all()), total

    async def create(self, client: Client) -> Client:
        self.db.add(client)
        await self.db.commit()
        await self.db.refresh(client)
        return client

    async def update(self, client: Client) -> Client:
        await self.db.commit()
        await self.db.refresh(client)
        return client

    async def delete(self, client: Client) -> None:
        await self.db.delete(client)
        await self.db.commit()
