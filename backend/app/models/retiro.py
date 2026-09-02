from typing import TYPE_CHECKING
from sqlalchemy import String, Integer, Numeric, ForeignKey, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from app.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class Retiro(Base, TimestampMixin):
    __tablename__ = "retiros"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    source_method: Mapped[str] = mapped_column(String(30), nullable=False, default="nequi")
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    retiro_date: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=lambda: datetime.now(ZoneInfo("America/Bogota")).replace(tzinfo=None))
    reference: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    distribution_category: Mapped[str] = mapped_column(String(30), nullable=False, default="utilidad")
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)

    user: Mapped["User"] = relationship("User")
