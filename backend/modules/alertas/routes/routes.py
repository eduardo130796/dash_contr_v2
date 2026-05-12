from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from backend.core.database.database import get_db
from backend.modules.alertas.services.alertas_service import AlertasService
from backend.modules.alertas.schemas.schemas import AlertaResponse, AlertaStats, DismissRequest

router = APIRouter(prefix="/alertas", tags=["Alertas"])

@router.get("", response_model=List[AlertaResponse])
async def list_alerts(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    category: Optional[str] = None,
    contract_id: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    service = AlertasService(db)
    filters = {
        "status": status,
        "severity": severity,
        "category": category,
        "contract_id": contract_id,
        "search": search
    }
    return await service.list_alerts(filters, page, limit)

@router.get("/stats", response_model=AlertaStats)
async def get_stats(db: AsyncSession = Depends(get_db)):
    service = AlertasService(db)
    stats = await service.get_stats()
    # Mapear para o schema garantindo valores default
    return AlertaStats(
        critical=stats.get("critical", 0),
        high=stats.get("high", 0),
        medium=stats.get("medium", 0),
        low=stats.get("low", 0),
        info=stats.get("info", 0),
        resolved_today=stats.get("resolved_today", 0)
    )

@router.post("/{alert_id}/view")
async def view_alert(alert_id: str, db: AsyncSession = Depends(get_db)):
    service = AlertasService(db)
    alert = await service.mark_as_viewed(alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alerta não encontrado")
    return {"status": "success", "message": "Alerta marcado como visto"}

@router.post("/{alert_id}/dismiss")
async def dismiss_alert(alert_id: str, req: DismissRequest, db: AsyncSession = Depends(get_db)):
    service = AlertasService(db)
    alert = await service.dismiss_alert(alert_id, req.reason)
    if not alert:
        raise HTTPException(status_code=404, detail="Alerta não encontrado")
    return {"status": "success", "message": "Alerta dispensado"}
