from sqlalchemy.ext.asyncio import AsyncSession

from app.models.client import Client
from app.repositories.client_repository import ClientRepository
from app.schemas.client import ClientCreate, ClientUpdate
from app.exceptions import NotFoundException, ConflictException


class ClientService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ClientRepository(db)

    async def get_client(self, client_id: int) -> Client:
        client = await self.repo.get_by_id(client_id)
        if not client:
            raise NotFoundException("Cliente", client_id)
        return client

    async def get_clients(self, skip: int = 0, limit: int = 50, search: str = "") -> tuple[list[Client], int]:
        return await self.repo.get_all(skip, limit, search)

    async def create_client(self, data: ClientCreate) -> Client:
        if await self.repo.get_by_document(data.document_number):
            raise ConflictException(f"Ya existe un cliente con documento {data.document_number}")

        client = Client(**data.model_dump())
        return await self.repo.create(client)

    async def update_client(self, client_id: int, data: ClientUpdate) -> Client:
        client = await self.get_client(client_id)

        if data.document_number and data.document_number != client.document_number:
            if await self.repo.get_by_document(data.document_number):
                raise ConflictException(f"Ya existe un cliente con documento {data.document_number}")

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(client, key, value)

        return await self.repo.update(client)

    async def delete_client(self, client_id: int) -> None:
        client = await self.get_client(client_id)
        client.is_active = False
        await self.repo.update(client)
