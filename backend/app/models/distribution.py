from typing import TYPE_CHECKING
from sqlalchemy import Integer, Numeric, ForeignKey, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime

from app.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.sale import Sale


class SaleDistribution(Base, TimestampMixin):
    __tablename__ = "sale_distributions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sale_id: Mapped[int] = mapped_column(Integer, ForeignKey("sales.id"), nullable=False, unique=True)
    sale_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    sale_total: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    monto_recibido: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)

    pct_utilidad: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=20.0)
    pct_gastos: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=10.0)
    pct_inversion: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=70.0)

    monto_utilidad: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    monto_gastos: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    monto_inversion: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)

    invoice_number: Mapped[str] = mapped_column(Text, nullable=False)
    client_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    payment_method: Mapped[str] = mapped_column(Text, nullable=False, default="efectivo")
    status: Mapped[str] = mapped_column(Text, nullable=False, default="activa")

    sale: Mapped["Sale"] = relationship("Sale")
