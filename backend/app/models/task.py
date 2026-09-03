from typing import TYPE_CHECKING
from sqlalchemy import String, Integer, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from zoneinfo import ZoneInfo

from app.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.client import Client
    from app.models.user import User


class Task(Base, TimestampMixin):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    task_type: Mapped[str] = mapped_column(String(30), nullable=False, default="general")
    client_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("clients.id"), nullable=True)
    user_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    due_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pendiente")
    priority: Mapped[str] = mapped_column(String(20), nullable=False, default="media")
    created_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)

    client: Mapped["Client | None"] = relationship("Client")
    assignee: Mapped["User | None"] = relationship("User", foreign_keys=[user_id])
    creator: Mapped["User"] = relationship("User", foreign_keys=[created_by])

    @property
    def client_name(self) -> str | None:
        return self.client.name if self.client else None

    @property
    def assignee_name(self) -> str | None:
        if self.assignee is None:
            return None
        return self.assignee.full_name or self.assignee.username

    @property
    def creator_name(self) -> str | None:
        if self.creator is None:
            return None
        return self.creator.full_name or self.creator.username
