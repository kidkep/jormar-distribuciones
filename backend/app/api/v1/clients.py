from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_permission
from app.models.user import User
from app.schemas.client import ClientCreate, ClientUpdate, ClientResponse
from app.schemas.common import MessageResponse
from app.services.client_service import ClientService

router = APIRouter(prefix="/clients", tags=["Clientes"])


@router.get("", response_model=list[ClientResponse])
async def list_clients(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    search: str = Query("", max_length=100),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("clientes.view")),
):
    service = ClientService(db)
    skip = (page - 1) * size
    clients, total = await service.get_clients(skip, size, search)
    return clients


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("clientes.view")),
):
    service = ClientService(db)
    return await service.get_client(client_id)


@router.post("", response_model=ClientResponse, status_code=201)
async def create_client(
    data: ClientCreate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("clientes.create")),
):
    service = ClientService(db)
    return await service.create_client(data)


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: int,
    data: ClientUpdate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("clientes.edit")),
):
    service = ClientService(db)
    return await service.update_client(client_id, data)


@router.delete("/{client_id}", response_model=MessageResponse)
async def delete_client(
    client_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("clientes.delete")),
):
    service = ClientService(db)
    await service.delete_client(client_id)
    return MessageResponse(message="Cliente desactivado correctamente")
