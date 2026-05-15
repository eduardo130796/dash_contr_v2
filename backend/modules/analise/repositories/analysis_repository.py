from datetime import date

from sqlalchemy import and_, or_
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import load_only
from sqlalchemy import true

from backend.modules.contratos.models.models import Contrato


class AnalysisRepository:

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_contracts_for_analysis(
        self,
        version: str = "1.0.0"
    ):
        """
        Busca apenas contratos monitoráveis que necessitam reanálise.

        Regras:
        - Apenas contratos ativos/vigentes
        - Contratos nunca analisados
        - Contratos alterados operacionalmente
        - Contratos com versão de análise desatualizada
        """

        today = date.today()

        stmt = (
            select(Contrato)
            .options(
                load_only(
                    Contrato.id,
                    Contrato.contract_number,
                    Contrato.is_active,
                    Contrato.status,
                    Contrato.vigencia_fim,
                    Contrato.last_analysis_at,
                    Contrato.last_operational_update_at,
                    Contrato.analysis_version,
                    Contrato.raw_contract,
                    Contrato.raw_garantias,
                    Contrato.raw_responsaveis,
                    Contrato.raw_historico,
                    Contrato.analysis,
                    Contrato.empenhos_status,
                    Contrato.faturas_status,
                    Contrato.historico_status,
                    Contrato.garantias_status,
                    Contrato.responsaveis_status,
                    Contrato.itens_status,
                )
            )
            .where(

                and_(

                    # =================================================
                    # CONTRATOS OPERACIONALMENTE ATIVOS
                    # =================================================

                    Contrato.is_active == true(),

                    # =================================================
                    # NECESSITAM REPROCESSAMENTO
                    # =================================================

                    or_(

                        Contrato.last_analysis_at.is_(None),

                        and_(

                            Contrato.last_analysis_at.is_not(None),

                            Contrato.last_operational_update_at.is_not(None),

                            Contrato.last_operational_update_at >
                            Contrato.last_analysis_at
                        ),

                        Contrato.analysis_version != version
                    )
                )
            )
        )

        result = await self.session.execute(stmt)

        contracts = result.scalars().all()

        return contracts