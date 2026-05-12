from typing import List
from backend.modules.analise.analyzers.base import BaseAnalyzer
from backend.modules.analise.schemas.alert_candidate import AlertCandidate
from backend.modules.contratos.models.models import Contrato
from backend.modules.contratos.domain.ativo_rules import is_vigencia_indefinida_status
from backend.modules.alertas.models.enums import AlertSeverityEnum, AlertPriorityEnum, AlertCategoryEnum

class MissingEndDateAnalyzer(BaseAnalyzer):
    @property
    def name(self) -> str:
        return "MissingEndDateAnalyzer"

    async def analyze(self, contract: Contrato) -> List[AlertCandidate]:
        candidates = []

        if is_vigencia_indefinida_status(contract.status):
            return candidates

        # Considerar apenas contratos ativos (exceto vigência indeterminada, tratada acima)
        if not contract.is_active:
            return candidates

        raw = contract.raw_contract or {}
        
        if not vigencia_fim:
            candidates.append(AlertCandidate(
                contract_id=contract.id,
                type="missing_end_date",
                category=AlertCategoryEnum.CADASTRO,
                severity=AlertSeverityEnum.MEDIUM,
                priority=AlertPriorityEnum.NORMAL,
                title="Data de Término Ausente",
                message=f"O contrato ativo {contract.contract_number} não possui data de término de vigência definida.",
                recommended_action="Verificar o cadastro do contrato no Comprasnet e atualizar a vigência.",
                analyzer_name=self.name,
                metadata={"missing_field": "vigencia_fim"}
            ))

        return candidates
