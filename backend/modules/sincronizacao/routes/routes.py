from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.database.database import get_db
from backend.core.responses.responses import success_response
from backend.modules.sincronizacao.services.services import SincronizacaoService

router = APIRouter(prefix="/sincronizacao", tags=["Sincronização Sob Demanda"])

@router.post("/contrato/{external_id}/refresh")
async def refresh_contrato(external_id: str, db: AsyncSession = Depends(get_db)):
    """
    Sincroniza um contrato específico sob demanda e tenta baixar seus endpoints secundários.
    """
    service = SincronizacaoService(db)
    result = await service.sync_contrato_on_demand(external_id)
    return success_response(data=result, message=result.get("message"))

@router.post("/contrato/{external_id}/refresh/{endpoint}")
async def refresh_endpoint_contrato(external_id: str, endpoint: str, db: AsyncSession = Depends(get_db)):
    """
    Sincroniza apenas UM endpoint secundário específico de um contrato.
    Valores permitidos: empenhos, faturas, historico, garantias, responsaveis, itens
    """
    service = SincronizacaoService(db)
    result = await service.sync_endpoint_on_demand(external_id, endpoint)
    return success_response(data=result, message=result.get("message"))
