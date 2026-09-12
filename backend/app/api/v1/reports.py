import io
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_permission
from app.models.user import User
from app.services.analytics_service import build_analytics
from app.utils.word_report import generate_report_docx_bytes

router = APIRouter(prefix="/reports", tags=["Reportes"])


@router.get("/download")
async def download_report(
    fecha_inicio: str = Query("", description="YYYY-MM-DD"),
    fecha_fin: str = Query("", description="YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("reportes.descargar")),
):
    data = await build_analytics(db, fecha_inicio, fecha_fin)
    docx_bytes = generate_report_docx_bytes(data)

    hoy = datetime.now().strftime("%Y-%m-%d")
    filename = f"informe_gestion_jormar_{hoy}.docx"

    return StreamingResponse(
        io.BytesIO(docx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )