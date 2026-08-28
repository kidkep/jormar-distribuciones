from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from zoneinfo import ZoneInfo

from app.models.task import Task
from app.repositories.task_repository import TaskRepository
from app.schemas.task import TaskCreate, TaskUpdate
from app.exceptions import NotFoundException


class TaskService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = TaskRepository(db)

    async def get_task(self, task_id: int) -> Task:
        task = await self.repo.get_by_id(task_id)
        if not task:
            raise NotFoundException("Tarea", task_id)
        return task

    async def get_tasks(self, skip: int = 0, limit: int = 50, status: str = "", search: str = "") -> tuple[list[Task], int]:
        return await self.repo.get_all(skip, limit, status, search)

    async def create_task(self, data: TaskCreate, created_by: int) -> Task:
        task = Task(
            title=data.title,
            description=data.description,
            task_type=data.task_type,
            client_id=data.client_id,
            user_id=data.user_id,
            due_date=data.due_date,
            priority=data.priority,
            status="pendiente",
            created_by=created_by,
        )
        return await self.repo.create(task)

    async def update_task(self, task_id: int, data: TaskUpdate) -> Task:
        task = await self.get_task(task_id)

        update_fields = data.model_dump(exclude_unset=True)
        for field, value in update_fields.items():
            setattr(task, field, value)

        return await self.repo.update(task)

    async def delete_task(self, task_id: int) -> None:
        task = await self.get_task(task_id)
        await self.repo.delete(task)

    async def get_overdue_debtor_reminders(self) -> list[dict]:
        today = datetime.now(ZoneInfo("America/Bogota")).replace(tzinfo=None)
        result = await self.db.execute(
            select(Task).where(Task.task_type == "deudor", Task.status == "pendiente", Task.due_date.isnot(None), Task.due_date < today)
        )
        overdue = list(result.scalars().all())
        return [
            {
                "id": t.id,
                "title": t.title,
                "description": t.description,
                "due_date": t.due_date,
            }
            for t in overdue
        ]
