from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from backend.modules.contratos.models.models import Contrato

class ContratoRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, contrato_id: str) -> Optional[Contrato]:
        result = await self.session.execute(select(Contrato).filter(Contrato.id == contrato_id))
        return result.scalars().first()

    async def get_by_external_id(self, external_id: str) -> Optional[Contrato]:
        result = await self.session.execute(select(Contrato).filter(Contrato.external_id == external_id))
        return result.scalars().first()

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[Contrato]:
        result = await self.session.execute(select(Contrato).offset(skip).limit(limit))
        return list(result.scalars().all())

    async def create(self, contrato: Contrato) -> Contrato:
        self.session.add(contrato)
        await self.session.commit()
        await self.session.refresh(contrato)
        return contrato

    async def update(self, contrato: Contrato) -> Contrato:
        await self.session.commit()
        await self.session.refresh(contrato)
        return contrato
