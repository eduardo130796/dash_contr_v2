import asyncio
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from backend.modules.analise.repositories.analysis_repository import AnalysisRepository
from backend.modules.alertas.repositories.alertas_repository import AlertasRepository
from backend.modules.analise.analyzers.contract_expiration import ContractExpirationAnalyzer
from backend.modules.analise.analyzers.sync_failure import SyncFailureAnalyzer
from backend.modules.analise.analyzers.missing_responsible import MissingResponsibleAnalyzer
from backend.modules.analise.analyzers.missing_end_date import MissingEndDateAnalyzer
from backend.core.logging.logger import log
from backend.modules.analise.analyzers.missing_guarantee import (
    MissingGuaranteeAnalyzer,
)

from backend.modules.analise.analyzers.guarantee_expiration import (
    GuaranteeExpirationAnalyzer,
)

class AnalysisService:
    _lock = asyncio.Lock()
    VERSION = "1.1.2"

    def __init__(self, session: AsyncSession):
        self.session = session
        self.analysis_repo = AnalysisRepository(session)
        self.alert_repo = AlertasRepository(session)
        self.analyzers = [
            ContractExpirationAnalyzer(),
            SyncFailureAnalyzer(),
            MissingResponsibleAnalyzer(),
            MissingEndDateAnalyzer(),
            MissingGuaranteeAnalyzer(),
            GuaranteeExpirationAnalyzer(),
        ]

    async def run_full_analysis(self):
        """
        Executa a orquestração completa da Analysis Engine com proteção de concorrência.
        """
        if self._lock.locked():
            log.warning("Analysis Engine já está em execução. Ignorando esta chamada.")
            return

        async with self._lock:
            start_time = datetime.now(timezone.utc)
            log.info("Iniciando ciclo de análise da Analysis Engine", version=self.VERSION)
            
            try:
                # 1. Buscar contratos pendentes
                contracts = await self.analysis_repo.get_contracts_for_analysis(self.VERSION)
                log.info("Contratos identificados para análise", count=len(contracts))
                
                if not contracts:
                    return

                contract_ids = [c.id for c in contracts]
                
                # 2. Executar cada analyzer
                for analyzer in self.analyzers:
                    all_candidates = []
                    active_fingerprints = []
                    
                    for contract in contracts:

                        try:
                            candidates = await analyzer.analyze(contract)

                        except Exception as e:
                            log.error(
                                "Falha ao executar analyzer",
                                analyzer=analyzer.name,
                                contract_id=contract.id,
                                error=str(e),
                                exc_info=True,
                            )

                            continue

                        if candidates:
                            for cand in candidates:

                                cand_dict = cand.dict()
                                all_candidates.append(cand_dict)

                                fp = self.alert_repo.generate_fingerprint(
                                    cand.contract_id,
                                    cand.type,
                                    cand.metadata
                                )

                                active_fingerprints.append(fp)
                    
                    # 3. Persistência em lote (Upsert)
                    if all_candidates:
                        await self.alert_repo.bulk_upsert_alerts(all_candidates)
                    
                    # 4. Resolução automática (Mark as Resolved se não reportado)
                    await self.alert_repo.bulk_resolve_alerts(
                        contract_ids, active_fingerprints, analyzer.name
                    )

                # 5. Atualizar metadados dos contratos analisados
                now = datetime.now(timezone.utc)
                for contract in contracts:
                    contract.last_analysis_at = now
                    contract.analysis_version = self.VERSION
                
                await self.session.commit()
                
                duration = (datetime.now(timezone.utc) - start_time).total_seconds()
                log.info("Ciclo de análise concluído com sucesso", 
                         duration_sec=round(duration, 2), 
                         contracts_processed=len(contracts))

            except Exception as e:
                await self.session.rollback()
                log.error("Erro crítico durante execução da Analysis Engine", error=str(e), exc_info=True)
                raise e
