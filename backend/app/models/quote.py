from typing import TYPE_CHECKING
from sqlalchemy import String, Integer, Numeric, ForeignKey, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from app.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.client import Client
    from app.models.user import User


class Quote(Base, TimestampMixin):
    __tablename__ = "quotes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    quote_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    quote_date: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=lambda: datetime.now(ZoneInfo("America/Bogota")).replace(tzinfo=None))
    valid_until: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    client_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("clients.id"), nullable=True)
    client_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    subtotal: Mapped[float] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    tax_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    discount: Mapped[float] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    total: Mapped[float] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="borrador")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    client: Mapped["Client | None"] = relationship("Client")
    user: Mapped["User"] = relationship("User")
    items: Mapped[list["QuoteItem"]] = relationship("QuoteItem", back_populates="quote", cascade="all, delete-orphan")


class QuoteItem(Base):
    __tablename__ = "quote_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    quote_id: Mapped[int] = mapped_column(Integer, ForeignKey("quotes.id"), nullable=False)
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("products.id"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    total_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    quote: Mapped["Quote"] = relationship("Quote", back_populates="items")
    product: Mapped["Product"] = relationship("Product")
