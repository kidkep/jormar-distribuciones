import io
from datetime import datetime

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.database import get_db
from app.dependencies import require_permission
from app.models.user import User
from app.utils import backup_exporter

router = APIRouter(prefix="/export", tags=["Exportación"])


@router.post("/backup")
async def export_backup(
    db=Depends(get_db),
    _user: User = Depends(require_permission("reportes.ver")),
):
    conn = await db.connection()
    tables = await backup_exporter.extract_tables(conn)

    fecha = datetime.now().strftime("%Y-%m-%d_%H-%M")
    zip_name = f"backup_{fecha}.zip"

    xlsx_bytes = backup_exporter.build_xlsx_bytes(tables)
    sql_text = await backup_exporter.build_sql_dump(conn, tables)
    zip_bytes = backup_exporter.build_backup_zip_bytes(xlsx_bytes, sql_text, fecha)

    return StreamingResponse(
        io.BytesIO(zip_bytes),
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={zip_name}"},
    )
