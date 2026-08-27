import json
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.models.user import User


def record_audit(
    db: AsyncSession,
    requester: User | None,
    action: str,
    entity_type: str,
    entity_id=None,
    old_values=None,
    new_values=None,
    ip_address: str | None = None,
) -> None:
    def _serialize(value):
        if value is None:
            return None
        if isinstance(value, dict):
            return json.dumps(value, ensure_ascii=False, default=str)
        return str(value)

    db.add(
        AuditLog(
            user_id=requester.id if requester else None,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id is not None else None,
            old_values=_serialize(old_values),
            new_values=_serialize(new_values),
            ip_address=ip_address,
        )
    )
