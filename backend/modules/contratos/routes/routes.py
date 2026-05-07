from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from backend.core.database.database import get_db
from backend.core.responses.responses import APIResponse, success_response
from backend.modules.contratos.services.services import ContratoService

router = APIRouter(prefix="/contratos", tags=["contratos"])

@router.get("/", response_model=APIResponse)
async def list_contratos(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    service = ContratoService(db)
    contratos = await service.get_contratos(skip=skip, limit=limit)
    return success_response(data=[c.model_dump() for c in contratos])

@router.get("/{contrato_id}", response_model=APIResponse)
async def get_contrato(contrato_id: str, db: AsyncSession = Depends(get_db)):
    service = ContratoService(db)
    contrato = await service.get_contrato_by_id(contrato_id)
    return success_response(data=contrato.model_dump())
