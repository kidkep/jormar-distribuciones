from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_permission
from app.models.user import User
from app.schemas.client import ClientCreate, ClientUpdate, ClientResponse
from app.schemas.common import MessageResponse
from app.services.client_service import ClientService
from app.utils.audit import record_audit

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
    client = await service.create_client(data)
    record_audit(
        db, _user, "create", "client",
        entity_id=client.id,
        new_values={"name": client.name, "document_number": client.document_number},
    )
    return client


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: int,
    data: ClientUpdate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("clientes.edit")),
):
    service = ClientService(db)
    existing = await service.get_client(client_id)
    old_values = {"name": existing.name, "document_number": existing.document_number}
    updated = await service.update_client(client_id, data)
    record_audit(
        db, _user, "update", "client",
        entity_id=client_id,
        old_values=old_values,
        new_values={"name": updated.name, "document_number": updated.document_number},
    )
    return updated


@router.delete("/{client_id}", response_model=MessageResponse)
async def delete_client(
    client_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("clientes.delete")),
):
    service = ClientService(db)
    existing = await service.get_client(client_id)
    old_values = {"name": existing.name, "document_number": existing.document_number}
    await service.delete_client(client_id)
    record_audit(db, _user, "delete", "client", entity_id=client_id, old_values=old_values)
    return MessageResponse(message="Cliente desactivado correctamente")
