# JORMAR DISTRIBUCIONES - Instrucciones para el agente

## Workflow obligatorio
- Después de CADA modificación al repositorio, hacer **commit y push** a `main`.
- Los deploys son automáticos al hacer push: backend en Render (rama main, rootDir `backend`), frontend en Vercel.
- Mensajes de commit: conventional commits en español, estilo:
  - `feat: ...`
  - `fix: ...`
  - `chore: ...`
- Nunca commitear secretos ni `.env`. No forzar push.
- Al hacer push, informar al usuario que Render y Vercel desplegarán automáticamente.

## Recordatorio (cambios clave del proyecto)
- Backend: FastAPI + SQLAlchemy async + Alembic + PostgreSQL (Neon). Python 3.12 (ver `.python-version`).
- Frontend: React + Vite + TypeScript + TailwindCSS.
- El SKU de productos es AUTO-generado (último SKU numérico + 1), no editable.
- Los PDFs se generan en memoria (Render es efímero).