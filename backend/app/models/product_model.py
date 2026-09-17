from sqlalchemy import String, Integer, ForeignKey, LargeBinary
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin


class ProductModel(Base, TimestampMixin):
    """Modelo 3D (GLB/GLTF) asociado a un producto del inventario.

    Permite subir, reemplazar y eliminar el modelo 3D de cada producto sin
    cambiar codigo, y queda disponible para el probador virtual.
    """

    __tablename__ = "product_models"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("products.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(
        String(100), nullable=False, default="model/gltf-binary"
    )
    size: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    data: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
