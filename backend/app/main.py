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
            "ALTER TABLE retiros ADD COLUMN IF NOT EXISTS distribution_category VARCHAR(30) NOT NULL DEFAULT 'utilidad'"
        ))
        await conn.execute(text(
            "ALTER TABLE expenses ADD COLUMN IF NOT EXISTS distribution_category VARCHAR(30) NOT NULL DEFAULT 'costos'"
        ))
        await conn.execute(text(
            "ALTER TABLE expenses ADD COLUMN IF NOT EXISTS retiro_id INTEGER REFERENCES retiros(id)"
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
        await conn.execute(text(
            "CREATE TABLE IF NOT EXISTS prestamos ("
            "id SERIAL PRIMARY KEY, "
            "person_name VARCHAR(255) NOT NULL, "
            "amount NUMERIC(12,2) NOT NULL, "
            "remaining NUMERIC(12,2) NOT NULL, "
            "distribution_category VARCHAR(30) NOT NULL DEFAULT 'utilidad', "
            "payment_method VARCHAR(30) NOT NULL DEFAULT 'efectivo', "
            "description VARCHAR(255) NOT NULL, "
            "status VARCHAR(20) NOT NULL DEFAULT 'activo', "
            "reference VARCHAR(100), "
            "notes TEXT, "
            "user_id INTEGER REFERENCES users(id), "
            "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), "
            "updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"
            ")"
        ))
        await conn.execute(text(
            "CREATE TABLE IF NOT EXISTS prestamo_pagos ("
            "id SERIAL PRIMARY KEY, "
            "prestamo_id INTEGER NOT NULL REFERENCES prestamos(id) ON DELETE CASCADE, "
            "amount NUMERIC(12,2) NOT NULL, "
            "payment_method VARCHAR(30) NOT NULL DEFAULT 'efectivo', "
            "payment_date TIMESTAMP NOT NULL DEFAULT NOW(), "
            "notes TEXT, "
            "user_id INTEGER REFERENCES users(id), "
            "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), "
            "updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"
            ")"
        ))
        await conn.execute(text(
            "CREATE TABLE IF NOT EXISTS colchon_config ("
            "id SERIAL PRIMARY KEY, "
            "monto_base NUMERIC(12,2) NOT NULL DEFAULT 1000000, "
            "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), "
            "updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"
            ")"
        ))
        await conn.execute(text(
            "CREATE TABLE IF NOT EXISTS colchon_prestamos ("
            "id SERIAL PRIMARY KEY, "
            "person_name VARCHAR(255) NOT NULL, "
            "amount NUMERIC(12,2) NOT NULL, "
            "remaining NUMERIC(12,2) NOT NULL, "
            "payment_method VARCHAR(30) NOT NULL DEFAULT 'efectivo', "
            "description VARCHAR(255) NOT NULL, "
            "status VARCHAR(20) NOT NULL DEFAULT 'activo', "
            "notes TEXT, "
            "user_id INTEGER REFERENCES users(id), "
            "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), "
            "updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"
            ")"
        ))
        await conn.execute(text(
            "CREATE TABLE IF NOT EXISTS colchon_pagos ("
            "id SERIAL PRIMARY KEY, "
            "colchon_prestamo_id INTEGER NOT NULL REFERENCES colchon_prestamos(id) ON DELETE CASCADE, "
            "amount NUMERIC(12,2) NOT NULL, "
            "payment_method VARCHAR(30) NOT NULL DEFAULT 'efectivo', "
            "payment_date TIMESTAMP NOT NULL DEFAULT NOW(), "
            "notes TEXT, "
            "user_id INTEGER REFERENCES users(id), "
            "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), "
            "updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"
            ")"
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
                ("finanzas.prestamos", "Gestionar prestamos internos", "finanzas"),
                ("finanzas.colchon", "Gestionar colchon financiero", "finanzas"),
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
        from sqlalchemy import select as sa_select
        from sqlalchemy.orm import selectinload
        from app.models import Role, Permission

        ALL_PERMISSIONS = [
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
            ("finanzas.prestamos", "Gestionar prestamos internos", "finanzas"),
            ("finanzas.colchon", "Gestionar colchon financiero", "finanzas"),
            ("reportes.ver", "Ver reportes", "reportes"),
            ("tareas.view", "Ver tareas y recordatorios", "tareas"),
            ("tareas.gestionar", "Gestionar tareas y recordatorios", "tareas"),
            ("usuarios.gestionar", "Gestionar usuarios", "sistema"),
            ("roles.gestionar", "Gestionar roles", "sistema"),
            ("sistema.exportar_db", "Exportar base de datos", "sistema"),
            ("sistema.exportar", "Exportar datos", "sistema"),
        ]

        for name, description, module in ALL_PERMISSIONS:
            result = await db.execute(sa_select(Permission).where(Permission.name == name))
            if not result.scalar_one_or_none():
                db.add(Permission(name=name, description=description, module=module))
        await db.commit()

        result = await db.execute(
            sa_select(Role)
            .options(selectinload(Role.permissions))
            .where(Role.name == "admin")
        )
        admin_role = result.scalar_one_or_none()
        if admin_role:
            all_perms = await db.execute(sa_select(Permission))
            all_perm_list = all_perms.scalars().all()
            for perm in all_perm_list:
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
