from sqlalchemy.ext.asyncio import AsyncSession

from app.models.supplier import Supplier
from app.repositories.supplier_repository import SupplierRepository
from app.schemas.supplier import SupplierCreate, SupplierUpdate
from app.exceptions import NotFoundException, ConflictException


class SupplierService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = SupplierRepository(db)

    async def get_supplier(self, supplier_id: int) -> Supplier:
        supplier = await self.repo.get_by_id(supplier_id)
        if not supplier:
            raise NotFoundException("Proveedor", supplier_id)
        return supplier

    async def get_suppliers(self, skip: int = 0, limit: int = 50, search: str = "") -> tuple[list[Supplier], int]:
        return await self.repo.get_all(skip, limit, search)

    async def create_supplier(self, data: SupplierCreate) -> Supplier:
        if await self.repo.get_by_document(data.document_number):
            raise ConflictException(f"Ya existe un proveedor con documento {data.document_number}")

        supplier = Supplier(**data.model_dump())
        return await self.repo.create(supplier)

    async def update_supplier(self, supplier_id: int, data: SupplierUpdate) -> Supplier:
        supplier = await self.get_supplier(supplier_id)

        if data.document_number and data.document_number != supplier.document_number:
            if await self.repo.get_by_document(data.document_number):
                raise ConflictException(f"Ya existe un proveedor con documento {data.document_number}")

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(supplier, key, value)

        return await self.repo.update(supplier)

    async def delete_supplier(self, supplier_id: int) -> None:
        supplier = await self.get_supplier(supplier_id)
        supplier.is_active = False
        await self.repo.update(supplier)
