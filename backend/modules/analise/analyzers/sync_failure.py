from typing import List
from backend.modules.analise.analyzers.base import BaseAnalyzer
from backend.modules.analise.schemas.alert_candidate import AlertCandidate
from backend.modules.contratos.models.models import Contrato
from backend.modules.alertas.models.enums import AlertSeverityEnum, AlertPriorityEnum, AlertCategoryEnum

class SyncFailureAnalyzer(BaseAnalyzer):
    @property
    def name(self) -> str:
        return "SyncFailureAnalyzer"

    async def analyze(self, contract: Contrato) -> List[AlertCandidate]:
        candidates = []
        
        failed_endpoints = []
        if contract.empenhos_status == "failed":
            failed_endpoints.append("Empenhos")
        if contract.faturas_status == "failed":
            failed_endpoints.append("Faturas")
        if contract.historico_status == "failed":
            failed_endpoints.append("Histórico")
        if contract.garantias_status == "failed":
            failed_endpoints.append("Garantias")

        if failed_endpoints:
            candidates.append(AlertCandidate(
                contract_id=contract.id,
                type="sync_failure",
                category=AlertCategoryEnum.SINCRONIZACAO,
                severity=AlertSeverityEnum.HIGH,
                priority=AlertPriorityEnum.HIGH,
                title="Falha na Sincronização de Dados",
                message=f"Não foi possível sincronizar os seguintes dados do contrato: {', '.join(failed_endpoints)}.",
                recommended_action="Verificar estabilidade da API do Comprasnet ou credenciais de acesso.",
                analyzer_name=self.name,
                metadata={"failed_endpoints": failed_endpoints}
            ))

        return candidates
