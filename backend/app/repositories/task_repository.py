from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload

from app.models.task import Task


class TaskRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, task_id: int) -> Task | None:
        result = await self.db.execute(
            select(Task)
            .options(selectinload(Task.client), selectinload(Task.assignee), selectinload(Task.creator))
            .where(Task.id == task_id)
        )
        return result.unique().scalar_one_or_none()

    async def get_all(self, skip: int = 0, limit: int = 50, status: str = "", search: str = "") -> tuple[list[Task], int]:
        query = select(Task).options(selectinload(Task.client), selectinload(Task.assignee), selectinload(Task.creator))
        count_query = select(func.count()).select_from(Task)

        if status:
            query = query.where(Task.status == status)
            count_query = count_query.where(Task.status == status)

        if search:
            filter_condition = Task.title.ilike(f"%{search}%") | (Task.description.ilike(f"%{search}%") if Task.description is not None else False)
            query = query.where(filter_condition)
            count_query = count_query.where(filter_condition)

        total_result = await self.db.execute(count_query)
        total = total_result.scalar()

        query = query.order_by(Task.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(query)
        tasks = list(result.unique().scalars().all())
        return tasks, total or 0

    async def create(self, task: Task) -> Task:
        self.db.add(task)
        await self.db.commit()
        await self.db.refresh(task)
        return task

    async def update(self, task: Task) -> Task:
        await self.db.commit()
        await self.db.refresh(task)
        return task

    async def delete(self, task: Task) -> None:
        await self.db.delete(task)
        await self.db.commit()
