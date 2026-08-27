from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product
from app.repositories.product_repository import ProductRepository
from app.schemas.product import ProductCreate, ProductUpdate
from app.exceptions import NotFoundException, ConflictException


class ProductService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ProductRepository(db)

    async def get_product(self, product_id: int) -> Product:
        product = await self.repo.get_by_id(product_id)
        if not product:
            raise NotFoundException("Producto", product_id)
        return product

    async def get_products(self, skip: int = 0, limit: int = 50, search: str = "") -> tuple[list[Product], int]:
        return await self.repo.get_all(skip, limit, search)

    async def get_low_stock(self) -> list[Product]:
        return await self.repo.get_low_stock()

    async def create_product(self, data: ProductCreate) -> Product:
        if await self.repo.get_by_sku(data.sku):
            raise ConflictException(f"Ya existe un producto con SKU {data.sku}")

        product = Product(**data.model_dump())
        await self.repo.create(product)
        return await self.repo.get_by_id(product.id)

    async def update_product(self, product_id: int, data: ProductUpdate) -> Product:
        product = await self.repo.get_by_id(product_id)
        if not product:
            raise NotFoundException("Producto", product_id)

        if data.sku and data.sku != product.sku:
            if await self.repo.get_by_sku(data.sku):
                raise ConflictException(f"Ya existe un producto con SKU {data.sku}")

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(product, key, value)

        await self.repo.update(product)
        return await self.repo.get_by_id(product_id)

    async def delete_product(self, product_id: int) -> None:
        product = await self.get_product(product_id)
        product.is_active = False
        await self.repo.update(product)
