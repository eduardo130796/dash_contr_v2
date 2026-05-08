from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database.database import get_db
from backend.core.responses.responses import APIResponse, success_response
from backend.modules.dashboard.services.services import DashboardService
from backend.modules.dashboard.schemas.schemas import DashboardStatsResponse

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get(
    "/stats",
    response_model=APIResponse,
    summary="KPIs do Dashboard Executivo",
    description=(
        "Retorna todos os KPIs calculados no backend para alimentar o ExecutiveCockpit. "
        "Substitui a função buildStats() que estava no DataContext.jsx do frontend."
    ),
)
async def get_dashboard_stats(db: AsyncSession = Depends(get_db)) -> APIResponse:
    service = DashboardService(db)
    stats: DashboardStatsResponse = await service.get_stats()
    return success_response(
        data=stats.model_dump(),
        message="Stats do dashboard calculados com sucesso",
    )
