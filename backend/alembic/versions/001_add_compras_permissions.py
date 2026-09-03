"""Add compras (solicitudes de pedido) permissions

Revision ID: 001
Revises: None
Create Date: 2026-09-03
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    permissions = [
        ("compras.view", "Ver solicitudes de pedido", "compras"),
        ("compras.create", "Crear solicitudes de pedido", "compras"),
        ("compras.edit", "Editar/actualizar solicitudes de pedido", "compras"),
    ]

    perm_ids = []
    for name, description, module in permissions:
        result = conn.execute(
            sa.text("SELECT id FROM permissions WHERE name = :name"), {"name": name}
        )
        row = result.fetchone()
        if not row:
            conn.execute(
                sa.text(
                    "INSERT INTO permissions (name, description, module, created_at, updated_at) "
                    "VALUES (:name, :description, :module, NOW(), NOW())"
                ),
                {"name": name, "description": description, "module": module},
            )
            result2 = conn.execute(
                sa.text("SELECT id FROM permissions WHERE name = :name"), {"name": name}
            )
            perm_ids.append(result2.fetchone()[0])
        else:
            perm_ids.append(row[0])

    result = conn.execute(
        sa.text("SELECT id FROM roles WHERE name = 'admin'")
    )
    admin_row = result.fetchone()
    if admin_row:
        admin_id = admin_row[0]
        for pid in perm_ids:
            exists = conn.execute(
                sa.text(
                    "SELECT 1 FROM role_permissions WHERE role_id = :rid AND permission_id = :pid"
                ),
                {"rid": admin_id, "pid": pid},
            ).fetchone()
            if not exists:
                conn.execute(
                    sa.text(
                        "INSERT INTO role_permissions (role_id, permission_id) VALUES (:rid, :pid)"
                    ),
                    {"rid": admin_id, "pid": pid},
                )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text("DELETE FROM role_permissions WHERE permission_id IN "
                "(SELECT id FROM permissions WHERE module = 'compras')")
    )
    conn.execute(
        sa.text("DELETE FROM permissions WHERE module = 'compras'")
    )
