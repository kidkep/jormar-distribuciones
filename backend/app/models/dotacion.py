from typing import TYPE_CHECKING
from sqlalchemy import String, Integer, ForeignKey, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from zoneinfo import ZoneInfo

from app.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.client import Client
    from app.models.product import Product


class DotacionEmpresa(Base, TimestampMixin):
    """Empresa que recibe dotacion y tiene empleados con tallas registradas."""

    __tablename__ = "dotacion_empresas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    document: Mapped[str | None] = mapped_column(String(50), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    contact_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    personas: Mapped[list["DotacionPersona"]] = relationship(
        "DotacionPersona", back_populates="company", cascade="all, delete-orphan"
    )


class DotacionPersona(Base, TimestampMixin):
    """Persona con perfil de tallas. Si company_id es NULL es cliente personal."""

    __tablename__ = "dotacion_personas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    document: Mapped[str | None] = mapped_column(String(50), nullable=True)
    company_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("dotacion_empresas.id"), nullable=True
    )
    client_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("clients.id"), nullable=True)
    position: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    company: Mapped["DotacionEmpresa | None"] = relationship("DotacionEmpresa", back_populates="personas")
    client: Mapped["Client | None"] = relationship("Client")
    tallas: Mapped[list["DotacionTalla"]] = relationship(
        "DotacionTalla", back_populates="persona", cascade="all, delete-orphan"
    )
    historial: Mapped[list["DotacionHistorial"]] = relationship(
        "DotacionHistorial", back_populates="persona", cascade="all, delete-orphan"
    )


class DotacionTalla(Base, TimestampMixin):
    """Talla actual de una prenda para una persona (perfil de tallas)."""

    __tablename__ = "dotacion_tallas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    persona_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("dotacion_personas.id", ondelete="CASCADE"), nullable=False
    )
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("products.id"), nullable=False)
    size: Mapped[str] = mapped_column(String(20), nullable=False)
    color: Mapped[str | None] = mapped_column(String(50), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    persona: Mapped["DotacionPersona"] = relationship("DotacionPersona", back_populates="tallas")
    product: Mapped["Product"] = relationship("Product")


class DotacionHistorial(Base, TimestampMixin):
    """Historial de tallas y dotacion entregada a una persona."""

    __tablename__ = "dotacion_historial"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    persona_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("dotacion_personas.id", ondelete="CASCADE"), nullable=False
    )
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("products.id"), nullable=False)
    size: Mapped[str] = mapped_column(String(20), nullable=False)
    color: Mapped[str | None] = mapped_column(String(50), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    dotacion_date: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(ZoneInfo("America/Bogota")).replace(tzinfo=None),
    )

    persona: Mapped["DotacionPersona"] = relationship("DotacionPersona", back_populates="historial")
    product: Mapped["Product"] = relationship("Product")