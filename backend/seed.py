import asyncio
from sqlalchemy import select

from app.database import engine, Base, AsyncSessionLocal
from app.models import Role, Permission, User
from app.utils.security import get_password_hash


PERMISSIONS = [
    ("productos.view", "Ver productos", "productos"),
    ("productos.create", "Crear productos", "productos"),
    ("productos.edit", "Editar productos", "productos"),
    ("productos.delete", "Eliminar productos", "productos"),
    ("clientes.view", "Ver clientes", "clientes"),
    ("clientes.create", "Crear clientes", "clientes"),
    ("clientes.edit", "Editar clientes", "clientes"),
    ("clientes.delete", "Eliminar clientes", "clientes"),
    ("proveedores.view", "Ver proveedores", "proveedores"),
    ("proveedores.create", "Crear proveedores", "proveedores"),
    ("proveedores.edit", "Editar proveedores", "proveedores"),
    ("proveedores.delete", "Eliminar proveedores", "proveedores"),
    ("inventario.view", "Ver inventario", "inventario"),
    ("inventario.movimientos", "Registrar movimientos", "inventario"),
    ("ventas.view", "Ver ventas", "ventas"),
    ("ventas.create", "Crear ventas", "ventas"),
    ("ventas.anular", "Anular ventas", "ventas"),
    ("cotizaciones.view", "Ver cotizaciones", "cotizaciones"),
    ("cotizaciones.create", "Crear cotizaciones", "cotizaciones"),
    ("cotizaciones.edit", "Editar cotizaciones", "cotizaciones"),
    ("deudores.view", "Ver deudores", "deudores"),
    ("deudores.gestionar", "Gestionar deudores", "deudores"),
    ("finanzas.view", "Ver finanzas", "finanzas"),
    ("finanzas.movimientos", "Registrar movimientos financieros", "finanzas"),
    ("finanzas.gastos", "Gestionar gastos y costos", "finanzas"),
    ("reportes.ver", "Ver reportes", "reportes"),
    ("usuarios.gestionar", "Gestionar usuarios", "sistema"),
    ("roles.gestionar", "Gestionar roles", "sistema"),
]


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        for name, description, module in PERMISSIONS:
            result = await db.execute(select(Permission).where(Permission.name == name))
            if not result.scalar_one_or_none():
                db.add(Permission(name=name, description=description, module=module))
        await db.commit()

        result = await db.execute(select(Role).where(Role.name == "admin"))
        admin_role = result.scalar_one_or_none()
        if not admin_role:
            all_perms = await db.execute(select(Permission))
            admin_role = Role(
                name="admin",
                description="Administrador del sistema",
                permissions=list(all_perms.scalars().all()),
            )
            db.add(admin_role)
            await db.commit()
            await db.refresh(admin_role)

        result = await db.execute(select(Role).where(Role.name == "vendedor"))
        if not result.scalar_one_or_none():
            vendedor = Role(
                name="vendedor",
                description="Vendedor general",
                permissions=[],
            )
            db.add(vendedor)
            await db.commit()

        result = await db.execute(select(User).where(User.email == "admin@jormar.com"))
        if not result.scalar_one_or_none():
            admin = User(
                email="admin@jormar.com",
                username="admin",
                full_name="Administrador JORMAR",
                hashed_password=get_password_hash("admin123"),
                is_active=True,
                is_superuser=True,
                role_id=admin_role.id,
            )
            db.add(admin)
            await db.commit()
            print("Usuario admin creado: admin@jormar.com / admin123")

    await engine.dispose()
    print("Seed completado exitosamente")


if __name__ == "__main__":
    asyncio.run(seed())
