from typing import TYPE_CHECKING
from sqlalchemy import String, Integer, Numeric, ForeignKey, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from zoneinfo import ZoneInfo

from app.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class Prestamo(Base, TimestampMixin):
    __tablename__ = "prestamos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    person_name: Mapped[str] = mapped_column(String(255), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    remaining: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    distribution_category: Mapped[str] = mapped_column(String(30), nullable=False, default="utilidad")
    payment_method: Mapped[str] = mapped_column(String(30), nullable=False, default="efectivo")
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="activo")
    reference: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)

    user: Mapped["User"] = relationship("User")
    pagos: Mapped[list["PrestamoPago"]] = relationship("PrestamoPago", back_populates="prestamo", cascade="all, delete-orphan")


class PrestamoPago(Base, TimestampMixin):
    __tablename__ = "prestamo_pagos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    prestamo_id: Mapped[int] = mapped_column(Integer, ForeignKey("prestamos.id"), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    payment_method: Mapped[str] = mapped_column(String(30), nullable=False, default="efectivo")
    payment_date: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=lambda: datetime.now(ZoneInfo("America/Bogota")).replace(tzinfo=None))
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)

    prestamo: Mapped["Prestamo"] = relationship("Prestamo", back_populates="pagos")
    user: Mapped["User"] = relationship("User")
