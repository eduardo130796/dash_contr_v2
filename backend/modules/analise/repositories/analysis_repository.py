from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_, and_
from backend.modules.contratos.models.models import Contrato

class AnalysisRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_contracts_for_analysis(self, version: str = "1.0.0"):
        """
        Busca contratos que foram alterados desde a última análise ou que estão em versão antiga.
        """
        stmt = (
            select(Contrato)
            .filter(
                or_(
                    Contrato.last_analysis_at == None,
                    Contrato.last_operational_update_at > Contrato.last_analysis_at,
                    Contrato.analysis_version != version
                )
            )
        )
        
        result = await self.session.execute(stmt)
        return result.scalars().all()
