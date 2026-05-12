from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from backend.core.database.database import get_db
from backend.core.responses.responses import APIResponse, success_response, error_response
from backend.modules.contratos.services.services import ContratoService
from backend.modules.contratos.schemas.schemas import ContractListResponse, Contrato360Response

router = APIRouter(prefix="/contracts", tags=["contratos"])


@router.get(
    "",
    response_model=APIResponse,
    summary="Listagem operacional de contratos",
    description="Retorna lista paginada de contratos com suporte a busca, filtros e ordenação no backend.",
)
async def list_contracts(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(
        None,
        description=(
            "Filtro de situação. Omitido = portfólio executivo (paridade com /dashboard/stats). "
            "`all` = sem filtro de situação."
        ),
    ),
    criticality: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    sort_by: str = Query("vigencia_fim"),
    order: str = Query("desc", regex="^(asc|desc)$"),
    instrument_kind: str = Query(
        "contrato",
        description="contrato | empenho | ata | all — escopo de instrumento (padrão = cockpit).",
    ),
    db: AsyncSession = Depends(get_db),
):
    service = ContratoService(db)
    try:
        data = await service.list_contracts(
            page=page,
            limit=limit,
            search=search,
            status=status,
            criticality=criticality,
            category=category,
            sort_by=sort_by,
            order=order,
            instrument_kind=instrument_kind,
        )
        return success_response(data=data.model_dump(), message="Contratos listados com sucesso")
    except Exception as e:
        return error_response(message=f"Erro ao listar contratos: {str(e)}")


@router.get(
    "/{contract_id}", 
    response_model=APIResponse,
    summary="Visão Analítica Contract 360",
    description="Retorna o payload consolidado e pré-processado para alimentar a visão 360 do contrato no frontend."
)
async def get_contract_360(
    contract_id: str,
    db: AsyncSession = Depends(get_db)
):
    service = ContratoService(db)
    try:
        data = await service.get_contract_360(contract_id)
        if not data:
            return error_response(message="Contrato não encontrado", status_code=404)
        
        return success_response(
            data=data.model_dump(),
            message="Visão 360 carregada com sucesso"
        )
    except Exception as e:
        return error_response(message=f"Erro ao gerar visão 360: {str(e)}")
