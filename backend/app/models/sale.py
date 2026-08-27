from typing import TYPE_CHECKING
from sqlalchemy import String, Boolean, Integer, Numeric, ForeignKey, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from app.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.client import Client
    from app.models.user import User
    from app.models.payment import Payment


class Sale(Base, TimestampMixin):
    __tablename__ = "sales"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    invoice_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    sale_date: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=lambda: datetime.now(ZoneInfo("America/Bogota")).replace(tzinfo=None))
    client_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("clients.id"), nullable=True)
    client_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    subtotal: Mapped[float] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    tax_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    discount: Mapped[float] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    total: Mapped[float] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    payment_method: Mapped[str] = mapped_column(String(30), nullable=False, default="efectivo")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pagada")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    delivery_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    delivered_by: Mapped[str | None] = mapped_column(String(255), nullable=True)

    client: Mapped["Client | None"] = relationship("Client", back_populates="sales")
    user: Mapped["User"] = relationship("User")
    items: Mapped[list["SaleItem"]] = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")
    payments: Mapped[list["Payment"]] = relationship("Payment", back_populates="sale", cascade="all, delete-orphan")


class SaleItem(Base):
    __tablename__ = "sale_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sale_id: Mapped[int] = mapped_column(Integer, ForeignKey("sales.id"), nullable=False)
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("products.id"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    total_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    sale: Mapped["Sale"] = relationship("Sale", back_populates="items")
    product: Mapped["Product"] = relationship("Product")
