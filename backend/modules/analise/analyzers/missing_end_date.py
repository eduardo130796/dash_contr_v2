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

        # Apenas contratos ativos
        if not contract.is_active:
            return candidates

        raw = contract.raw_contract or {}

        vigencia_fim = (
            raw.get("vigencia_fim")
            or raw.get("data_fim_vigencia")
        )

        if vigencia_fim:
            return candidates

        candidates.append(
            AlertCandidate(
                contract_id=contract.id,
                type="missing_end_date",
                category=AlertCategoryEnum.CADASTRO,
                severity=AlertSeverityEnum.MEDIUM,
                priority=AlertPriorityEnum.NORMAL,
                title="Data de término ausente",
                message=f"O contrato {contract.contract_number} não possui vigência final cadastrada.",
                recommended_action="Validar e atualizar a vigência contratual.",
                analyzer_name=self.name,
                metadata={
                    "missing_field": "vigencia_fim"
                }
            )
        )

        return candidates
