from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.models.product import Product
from app.models.product_model import ProductModel
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

    async def get_products(self, skip: int = 0, limit: int = 50, search: str = "", status: str = "all") -> tuple[list[Product], int]:
        return await self.repo.get_all(skip, limit, search, status)

    async def get_low_stock(self) -> list[Product]:
        return await self.repo.get_low_stock()

    async def next_sku(self) -> str:
        result = await self.db.execute(select(Product.sku))
        skus = result.scalars().all()
        max_num = 9999
        for sku in skus:
            if sku and sku.isdigit():
                max_num = max(max_num, int(sku))
        return str(max_num + 1)

    async def create_product(self, data: ProductCreate) -> Product:
        payload = data.model_dump()
        for _ in range(5):
            payload["sku"] = await self.next_sku()
            product = Product(**payload)
            try:
                await self.repo.create(product)
                return await self.repo.get_by_id(product.id)
            except IntegrityError:
                await self.db.rollback()
                continue
        raise ConflictException("No se pudo generar un SKU único para el producto")

    async def update_product(self, product_id: int, data: ProductUpdate) -> Product:
        product = await self.repo.get_by_id(product_id)
        if not product:
            raise NotFoundException("Producto", product_id)

        update_data = data.model_dump(exclude_unset=True)
        update_data.pop("sku", None)

        for key, value in update_data.items():
            setattr(product, key, value)

        await self.repo.update(product)
        return await self.repo.get_by_id(product_id)

    async def delete_product(self, product_id: int) -> None:
        product = await self.get_product(product_id)
        product.is_active = False
        await self.repo.update(product)

    async def toggle_product_status(self, product_id: int) -> Product:
        product = await self.get_product(product_id)
        product.is_active = not product.is_active
        await self.repo.update(product)
        return await self.repo.get_by_id(product_id)

    # --- Modelos 3D (GLB/GLTF) para el probador virtual ---

    async def get_product_model(self, product_id: int) -> ProductModel | None:
        result = await self.db.execute(
            select(ProductModel).where(ProductModel.product_id == product_id)
        )
        return result.scalar_one_or_none()

    async def save_product_model(
        self, product_id: int, filename: str, content_type: str, data: bytes
    ) -> ProductModel:
        await self.get_product(product_id)
        model = await self.get_product_model(product_id)
        if model is None:
            model = ProductModel(product_id=product_id)
            self.db.add(model)
        model.filename = filename
        model.content_type = content_type or "model/gltf-binary"
        model.size = len(data)
        model.data = data
        await self.db.commit()
        await self.db.refresh(model)
        return model

    async def delete_product_model(self, product_id: int) -> None:
        model = await self.get_product_model(product_id)
        if model is not None:
            await self.db.delete(model)
            await self.db.commit()
