from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.product import Product
from app.models.category import Category, Unit
from app.models.supplier import Supplier


class ProductRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, product_id: int) -> Product | None:
        result = await self.db.execute(
            select(Product)
            .options(
                selectinload(Product.category),
                selectinload(Product.unit),
                selectinload(Product.supplier),
            )
            .where(Product.id == product_id)
        )
        return result.scalar_one_or_none()

    async def get_by_sku(self, sku: str) -> Product | None:
        result = await self.db.execute(select(Product).where(Product.sku == sku))
        return result.scalar_one_or_none()

    async def get_all(self, skip: int = 0, limit: int = 50, search: str = "", status: str = "all") -> tuple[list[Product], int]:
        query = select(Product).options(
            selectinload(Product.category),
            selectinload(Product.unit),
            selectinload(Product.supplier),
        )
        count_query = select(func.count(Product.id))

        if status == "active":
            query = query.where(Product.is_active == True)
            count_query = count_query.where(Product.is_active == True)
        elif status == "inactive":
            query = query.where(Product.is_active == False)
            count_query = count_query.where(Product.is_active == False)

        if search:
            filter_condition = Product.name.ilike(f"%{search}%") | Product.sku.ilike(f"%{search}%")
            query = query.where(filter_condition)
            count_query = count_query.where(filter_condition)

        count_result = await self.db.execute(count_query)
        total = count_result.scalar()

        result = await self.db.execute(query.offset(skip).limit(limit).order_by(Product.id))
        return list(result.scalars().all()), total

    async def get_low_stock(self) -> list[Product]:
        result = await self.db.execute(
            select(Product)
            .options(
                selectinload(Product.category),
                selectinload(Product.unit),
            )
            .where(Product.current_stock <= Product.min_stock, Product.is_active == True)
            .order_by(Product.current_stock)
        )
        return list(result.scalars().all())

    async def create(self, product: Product) -> Product:
        self.db.add(product)
        await self.db.commit()
        await self.db.refresh(product)
        return product

    async def update(self, product: Product) -> Product:
        await self.db.commit()
        await self.db.refresh(product)
        return product

    async def delete(self, product: Product) -> None:
        await self.db.delete(product)
        await self.db.commit()


class CategoryRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, cat_id: int) -> Category | None:
        result = await self.db.execute(select(Category).where(Category.id == cat_id))
        return result.scalar_one_or_none()

    async def get_all(self) -> list[Category]:
        result = await self.db.execute(select(Category).order_by(Category.name))
        return list(result.scalars().all())

    async def create(self, category: Category) -> Category:
        self.db.add(category)
        await self.db.commit()
        await self.db.refresh(category)
        return category

    async def update(self, category: Category) -> Category:
        await self.db.commit()
        await self.db.refresh(category)
        return category

    async def delete(self, category: Category) -> None:
        await self.db.delete(category)
        await self.db.commit()


class UnitRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, unit_id: int) -> Unit | None:
        result = await self.db.execute(select(Unit).where(Unit.id == unit_id))
        return result.scalar_one_or_none()

    async def get_all(self) -> list[Unit]:
        result = await self.db.execute(select(Unit).order_by(Unit.name))
        return list(result.scalars().all())

    async def create(self, unit: Unit) -> Unit:
        self.db.add(unit)
        await self.db.commit()
        await self.db.refresh(unit)
        return unit

    async def update(self, unit: Unit) -> Unit:
        await self.db.commit()
        await self.db.refresh(unit)
        return unit

    async def delete(self, unit: Unit) -> None:
        await self.db.delete(unit)
        await self.db.commit()
