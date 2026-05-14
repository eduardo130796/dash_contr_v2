import asyncio
import time
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
from backend.modules.analise.analyzers.missing_closure import (
    MissingClosureAnalyzer,
)
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.exc import SQLAlchemyError

class AnalyzerExecutionResult(BaseModel):
    success: bool
    alerts_created: int
    execution_ms: float
    error: Optional[str] = None

class AnalysisService:
    _lock = asyncio.Lock()
    VERSION = "1.2.7"

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
            MissingClosureAnalyzer(),
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
                total_alerts_generated = 0
                analyzer_results = {}
                
                for analyzer in self.analyzers:
                    t_analyzer_start = time.perf_counter()
                    all_candidates = []
                    active_fingerprints = []
                    
                    try:
                        # Isolamento transacional por Analyzer completo
                        async with self.session.begin_nested():
                            for contract in contracts:
                                try:
                                    candidates = await analyzer.analyze(contract)
                                except Exception as e:
                                    # Se for erro SQL, a transação abortou no Postgres. Repassamos para forçar o rollback do savepoint.
                                    if isinstance(e, SQLAlchemyError):
                                        raise e
                                        
                                    # Erros lógicos isolados de um contrato apenas logamos sem quebrar o Analyzer inteiro.
                                    log.error(
                                        "Falha lógica ao executar analyzer (isolada no contrato)",
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
                                            cand.metadata_json
                                        )

                                        active_fingerprints.append(fp)
                            
                            # 3. Persistência em lote (Upsert)
                            if all_candidates:
                                await self.alert_repo.bulk_upsert_alerts(all_candidates)
                            
                            # 4. Resolução automática
                            await self.alert_repo.bulk_resolve_alerts(
                                contract_ids, active_fingerprints, analyzer.name
                            )

                        # Se chegou aqui, o savepoint foi commitado (subtransação completada)
                        t_analyzer_end = time.perf_counter()
                        exec_ms = round((t_analyzer_end - t_analyzer_start) * 1000, 2)
                        
                        analyzer_results[analyzer.name] = AnalyzerExecutionResult(
                            success=True,
                            alerts_created=len(all_candidates),
                            execution_ms=exec_ms,
                            error=None
                        ).model_dump()
                        
                        total_alerts_generated += len(all_candidates)

                    except Exception as e:
                        # Falha grave ou falha SQL. O context manager do begin_nested() já executou o rollback automático do savepoint.
                        t_analyzer_end = time.perf_counter()
                        exec_ms = round((t_analyzer_end - t_analyzer_start) * 1000, 2)
                        
                        sqlstate = getattr(e.__cause__, "pgcode", None) or getattr(e, "pgcode", None)
                        
                        log.error(
                            "Falha crítica no Analyzer (Transação Revertida via Savepoint)",
                            analyzer=analyzer.name,
                            execution_ms=exec_ms,
                            rollback_occurred=True,
                            exception_class=e.__class__.__name__,
                            sqlstate=sqlstate,
                            error=str(e),
                            exc_info=True
                        )
                        
                        analyzer_results[analyzer.name] = AnalyzerExecutionResult(
                            success=False,
                            alerts_created=0,
                            execution_ms=exec_ms,
                            error=str(e)
                        ).model_dump()
                        
                        continue

                # 5. Calcular Score (Motor de Risco) e Atualizar metadados
                t_motor_start = time.perf_counter()
                now = datetime.now(timezone.utc)
                from backend.modules.contratos.domain.motor_risco import MotorRisco
                from backend.modules.alertas.models.models import Alerta
                from backend.modules.alertas.models.enums import AlertStatusEnum
                from sqlalchemy.future import select
                
                stmt = select(Alerta).where(
                    Alerta.contract_id.in_(contract_ids),
                    Alerta.status.in_([AlertStatusEnum.ACTIVE, AlertStatusEnum.VIEWED])
                )
                result = await self.session.execute(stmt)
                all_active_alerts = result.scalars().all()
                
                alerts_by_contract = {}
                for alert in all_active_alerts:
                    alerts_by_contract.setdefault(alert.contract_id, []).append(alert)

                for contract in contracts:
                    active_alerts = alerts_by_contract.get(contract.id, [])
                    analysis_result = MotorRisco.calcular(contract, active_alerts)
                    contract.analysis = analysis_result.model_dump() if hasattr(analysis_result, 'model_dump') else analysis_result.dict()
                    contract.last_analysis_at = now
                    contract.analysis_version = self.VERSION
                
                await self.session.commit()
                t_motor_end = time.perf_counter()
                
                duration = (datetime.now(timezone.utc) - start_time).total_seconds()
                log.info(
                    "Ciclo de análise concluído com sucesso", 
                    duration_sec=round(duration, 2), 
                    contracts_processed=len(contracts),
                    total_alerts_generated=total_alerts_generated,
                    motor_risco_sec=round(t_motor_end - t_motor_start, 3),
                    analyzer_results=analyzer_results
                )

            except Exception as e:
                await self.session.rollback()
                log.error("Erro crítico durante execução da Analysis Engine", error=str(e), exc_info=True)
                raise e
