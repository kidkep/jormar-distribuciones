from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.supplier import Supplier


class SupplierRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, supplier_id: int) -> Supplier | None:
        result = await self.db.execute(select(Supplier).where(Supplier.id == supplier_id))
        return result.scalar_one_or_none()

    async def get_by_document(self, document_number: str) -> Supplier | None:
        result = await self.db.execute(select(Supplier).where(Supplier.document_number == document_number))
        return result.scalar_one_or_none()

    async def get_all(self, skip: int = 0, limit: int = 50, search: str = "") -> tuple[list[Supplier], int]:
        query = select(Supplier).where(Supplier.is_active == True)
        count_query = select(func.count(Supplier.id)).where(Supplier.is_active == True)

        if search:
            filter_condition = (
                Supplier.name.ilike(f"%{search}%")
                | Supplier.document_number.ilike(f"%{search}%")
            )
            query = query.where(filter_condition)
            count_query = count_query.where(filter_condition)

        count_result = await self.db.execute(count_query)
        total = count_result.scalar()

        result = await self.db.execute(query.offset(skip).limit(limit).order_by(Supplier.id))
        return list(result.scalars().all()), total

    async def create(self, supplier: Supplier) -> Supplier:
        self.db.add(supplier)
        await self.db.commit()
        await self.db.refresh(supplier)
        return supplier

    async def update(self, supplier: Supplier) -> Supplier:
        await self.db.commit()
        await self.db.refresh(supplier)
        return supplier

    async def delete(self, supplier: Supplier) -> None:
        await self.db.delete(supplier)
        await self.db.commit()
