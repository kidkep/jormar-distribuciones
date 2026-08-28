from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_permission
from app.models.user import User
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse
from app.schemas.common import MessageResponse
from app.services.task_service import TaskService
from app.utils.audit import record_audit

router = APIRouter(prefix="/tasks", tags=["Tareas"])


@router.get("", response_model=list[TaskResponse])
async def list_tasks(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    status: str = Query("", max_length=50),
    search: str = Query("", max_length=100),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("tareas.view")),
):
    service = TaskService(db)
    skip = (page - 1) * size
    tasks, total = await service.get_tasks(skip, size, status, search)
    return tasks


@router.get("/overdue", response_model=list[dict])
async def overdue_reminders(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("tareas.view")),
):
    service = TaskService(db)
    return await service.get_overdue_debtor_reminders()


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("tareas.view")),
):
    service = TaskService(db)
    return await service.get_task(task_id)


@router.post("", response_model=TaskResponse, status_code=201)
async def create_task(
    data: TaskCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("tareas.gestionar")),
):
    service = TaskService(db)
    task = await service.create_task(data, user.id)
    record_audit(db, user, "create", "task", entity_id=task.id, new_values={"title": task.title})
    return task


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    data: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("tareas.gestionar")),
):
    service = TaskService(db)
    task = await service.update_task(task_id, data)
    record_audit(db, _user, "update", "task", entity_id=task_id, new_values={"title": task.title})
    return task


@router.delete("/{task_id}", response_model=MessageResponse)
async def delete_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("tareas.gestionar")),
):
    service = TaskService(db)
    await service.delete_task(task_id)
    record_audit(db, _user, "delete", "task", entity_id=task_id)
    return MessageResponse(message="Tarea eliminada correctamente")
