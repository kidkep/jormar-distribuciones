import json
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.models.user import User


class AuditService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def log(
        self,
        user_id: int | None,
        action: str,
        entity_type: str,
        entity_id=None,
        old_values=None,
        new_values=None,
        ip_address: str | None = None,
    ) -> None:
        record = AuditLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id is not None else None,
            old_values=(
                json.dumps(old_values, ensure_ascii=False, default=str)
                if old_values is not None else None
            ),
            new_values=(
                json.dumps(new_values, ensure_ascii=False, default=str)
                if new_values is not None else None
            ),
            ip_address=ip_address,
        )
        self.db.add(record)

    async def list_logs(
        self,
        skip: int = 0,
        limit: int = 50,
        entity_type: str | None = None,
        action: str | None = None,
        username: str | None = None,
    ) -> tuple[list[dict], int]:
        query = (
            select(
                AuditLog,
                User.username,
                User.full_name,
            )
            .outerjoin(User, User.id == AuditLog.user_id)
            .order_by(desc(AuditLog.created_at), desc(AuditLog.id))
        )
        count_query = select(func.count(AuditLog.id))

        filters = []
        if entity_type:
            filters.append(AuditLog.entity_type == entity_type)
        if action:
            filters.append(AuditLog.action == action)
        if username:
            query = query.where(User.username.ilike(f"%{username}%"))
            count_query = count_query.where(
                AuditLog.user_id.in_(
                    select(User.id).where(User.username.ilike(f"%{username}%"))
                )
            )

        if filters:
            query = query.where(*filters)
            count_query = count_query.where(*filters)

        total = (await self.db.execute(count_query)).scalar() or 0
        rows = await self.db.execute(query.offset(skip).limit(limit))

        result = []
        for log, username_val, full_name_val in rows.all():
            result.append(
                {
                    "id": log.id,
                    "user_id": log.user_id,
                    "username": username_val,
                    "full_name": full_name_val,
                    "action": log.action,
                    "entity_type": log.entity_type,
                    "entity_id": log.entity_id,
                    "old_values": log.old_values,
                    "new_values": log.new_values,
                    "ip_address": log.ip_address,
                    "created_at": log.created_at,
                }
            )
        return result, total
