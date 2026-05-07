from sqlalchemy.ext.asyncio import AsyncSession
from backend.modules.contratos.repositories.repositories import ContratoRepository
from backend.modules.contratos.schemas.schemas import ContratoResponse, ContratoDetailResponse
from backend.core.exceptions.exceptions import BusinessException
from typing import List

class ContratoService:
    def __init__(self, session: AsyncSession):
        self.repo = ContratoRepository(session)

    async def get_contratos(self, skip: int = 0, limit: int = 100) -> List[ContratoResponse]:
        contratos = await self.repo.get_all(skip=skip, limit=limit)
        return [ContratoResponse.model_validate(c) for c in contratos]

    async def get_contrato_by_id(self, contrato_id: str) -> ContratoDetailResponse:
        contrato = await self.repo.get_by_id(contrato_id)
        if not contrato:
            raise BusinessException(message="Contrato não encontrado", status_code=404)
        return ContratoDetailResponse.model_validate(contrato)
