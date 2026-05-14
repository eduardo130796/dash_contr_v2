from typing import List
from backend.modules.analise.analyzers.base import BaseAnalyzer
from backend.modules.analise.domain.enrichment import is_dataset_ready
from backend.modules.analise.schemas.alert_candidate import AlertCandidate
from backend.modules.contratos.models.models import Contrato
from backend.modules.alertas.models.enums import AlertSeverityEnum, AlertPriorityEnum, AlertCategoryEnum

class MissingResponsibleAnalyzer(BaseAnalyzer):
    @property
    def name(self) -> str:
        return "MissingResponsibleAnalyzer"

    async def analyze(self, contract: Contrato) -> List[AlertCandidate]:
        if not is_dataset_ready(contract, "responsaveis"):
            return []

        candidates = []
        
        # O payload raw_responsaveis costuma ser uma lista
        responsaveis = contract.raw_responsaveis
        
        if not responsaveis or (isinstance(responsaveis, list) and len(responsaveis) == 0):
            candidates.append(AlertCandidate(
                contract_id=contract.id,
                type="missing_responsible",
                category=AlertCategoryEnum.COMPLIANCE,
                severity=AlertSeverityEnum.MEDIUM,
                priority=AlertPriorityEnum.NORMAL,
                title="Responsável Não Atribuído",
                message=f"O contrato {contract.contract_number} não possui responsáveis técnicos ou administrativos cadastrados.",
                recommended_action="Designar e cadastrar os responsáveis pelo contrato no sistema governamental.",
                analyzer_name=self.name,
                metadata_json={"has_responsaveis": False}
            ))

        return candidates
