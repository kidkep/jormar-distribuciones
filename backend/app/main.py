from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import get_settings
from app.database import engine, Base
from app.api.router import api_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.execute(text(
            "ALTER TABLE sales ADD COLUMN IF NOT EXISTS client_name VARCHAR(255)"
        ))
        await conn.execute(text(
            "ALTER TABLE quotes ADD COLUMN IF NOT EXISTS client_name VARCHAR(255)"
        ))
        await conn.execute(text(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS theme VARCHAR(30) NOT NULL DEFAULT 'gold'"
        ))
        await conn.execute(text(
            "ALTER TABLE sale_distributions "
            "ADD COLUMN IF NOT EXISTS monto_recibido NUMERIC(12,2) NOT NULL DEFAULT 0"
        ))
        await conn.execute(text(
            "UPDATE sale_distributions SET monto_recibido = sale_total "
            "WHERE status = 'activa' AND payment_method <> 'credito'"
        ))
        await conn.execute(text(
            "UPDATE sale_distributions sd SET monto_recibido = COALESCE("
            "(SELECT SUM(p.amount) FROM payments p WHERE p.sale_id = sd.sale_id), 0) "
            "WHERE sd.payment_method = 'credito'"
        ))
        await conn.execute(text(
            "UPDATE sale_distributions SET status = 'pendiente' "
            "WHERE payment_method = 'credito' AND monto_recibido <= 0"
        ))
        await conn.execute(text(
            "UPDATE sale_distributions SET "
            "monto_utilidad = ROUND(monto_recibido * pct_utilidad / 100.0, 2), "
            "monto_gastos = ROUND(monto_recibido * pct_gastos / 100.0, 2), "
            "monto_inversion = monto_recibido - "
            "ROUND(monto_recibido * pct_utilidad / 100.0, 2) - "
            "ROUND(monto_recibido * pct_gastos / 100.0, 2) "
            "WHERE payment_method = 'credito'"
        ))

    from sqlalchemy import select
    from app.database import AsyncSessionLocal
    from app.models import User, Role, Permission
    from app.utils.security import get_password_hash

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).limit(1))
        if not result.scalar_one_or_none():
            PERMISSIONS = [
                ("productos.view", "Ver productos", "productos"),
                ("productos.create", "Crear productos", "productos"),
                ("productos.edit", "Editar productos", "productos"),
                ("productos.delete", "Eliminar productos", "productos"),
("productos.toggle_status", "Activar/Desactivar productos", "productos"),
                ("productos.ver_compra", "Ver precio de compra de productos", "productos"),
                ("clientes.view", "Ver clientes", "clientes"),
                ("clientes.create", "Crear clientes", "clientes"),
                ("clientes.edit", "Editar clientes", "clientes"),
                ("clientes.delete", "Eliminar clientes", "clientes"),
                ("proveedores.view", "Ver proveedores", "proveedores"),
                ("proveedores.create", "Crear proveedores", "proveedores"),
                ("proveedores.edit", "Editar proveedores", "proveedores"),
                ("proveedores.delete", "Eliminar proveedores", "proveedores"),
                ("compras.view", "Ver solicitudes de pedido", "compras"),
                ("compras.create", "Crear solicitudes de pedido", "compras"),
                ("compras.edit", "Editar/actualizar solicitudes de pedido", "compras"),
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
                ("tareas.view", "Ver tareas y recordatorios", "tareas"),
                ("tareas.gestionar", "Gestionar tareas y recordatorios", "tareas"),
                ("usuarios.gestionar", "Gestionar usuarios", "sistema"),
                ("roles.gestionar", "Gestionar roles", "sistema"),
                ("sistema.exportar_db", "Exportar base de datos", "sistema"),
            ]
            for name, description, module in PERMISSIONS:
                result = await db.execute(select(Permission).where(Permission.name == name))
                if not result.scalar_one_or_none():
                    db.add(Permission(name=name, description=description, module=module))
            await db.commit()

            result = await db.execute(select(Role).where(Role.name == "admin"))
            admin_role = result.scalar_one_or_none()
            if not admin_role:
                all_perms = await db.execute(select(Permission))
                admin_role = Role(name="admin", description="Administrador del sistema", permissions=list(all_perms.scalars().all()))
                db.add(admin_role)
                await db.commit()
                await db.refresh(admin_role)

            result = await db.execute(select(Role).where(Role.name == "vendedor"))
            if not result.scalar_one_or_none():
                db.add(Role(name="vendedor", description="Vendedor general", permissions=[]))
                await db.commit()

            result = await db.execute(select(User).where(User.email == "admin@jormar.com"))
            admin = result.scalar_one_or_none()
            if not admin:
                admin = User(
                    email="admin@jormar.com",
                    username="jormar",
                    full_name="Administrador JORMAR",
                    hashed_password=get_password_hash("2908"),
                    is_active=True,
                    is_superuser=True,
                    role_id=admin_role.id,
                )
                db.add(admin)
                await db.commit()

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == "admin@jormar.com"))
        admin = result.scalar_one_or_none()
        if admin and admin.username != "jormar":
            admin.username = "jormar"
            admin.hashed_password = get_password_hash("2908")
            await db.commit()

    async with AsyncSessionLocal() as db:
        from sqlalchemy.orm import selectinload
        from app.models import Role, Permission

        NEW_PERMISSIONS = [
            ("sistema.exportar_db", "Exportar base de datos", "sistema"),
            ("sistema.exportar", "Exportar datos", "sistema"),
            ("tareas.view", "Ver tareas y recordatorios", "tareas"),
            ("tareas.gestionar", "Gestionar tareas y recordatorios", "tareas"),
            ("productos.toggle_status", "Activar/Desactivar productos", "productos"),
            ("productos.ver_compra", "Ver precio de compra de productos", "productos"),
            ("compras.view", "Ver solicitudes de pedido", "compras"),
            ("compras.create", "Crear solicitudes de pedido", "compras"),
            ("compras.edit", "Editar/actualizar solicitudes de pedido", "compras"),
        ]

        created_perms = []
        for name, description, module in NEW_PERMISSIONS:
            result = await db.execute(select(Permission).where(Permission.name == name))
            perm = result.scalar_one_or_none()
            if not perm:
                perm = Permission(name=name, description=description, module=module)
                db.add(perm)
                created_perms.append(perm)
        if created_perms:
            await db.flush()
            await db.commit()

        result = await db.execute(
            select(Role)
            .options(selectinload(Role.permissions))
            .where(Role.name == "admin")
        )
        admin_role = result.scalar_one_or_none()
        if admin_role:
            all_new = await db.execute(select(Permission).where(Permission.name.in_([p[0] for p in NEW_PERMISSIONS])))
            new_perm_set = all_new.scalars().all()
            for perm in new_perm_set:
                if perm not in admin_role.permissions:
                    admin_role.permissions.append(perm)
            await db.commit()

    yield
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

cors_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.APP_NAME}
