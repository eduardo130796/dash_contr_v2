from datetime import datetime, timezone
from typing import List
from backend.modules.analise.analyzers.base import BaseAnalyzer
from backend.modules.analise.schemas.alert_candidate import AlertCandidate
from backend.modules.contratos.models.models import Contrato
from backend.modules.contratos.domain.ativo_rules import is_vigencia_indefinida_status
from backend.modules.alertas.models.enums import AlertSeverityEnum, AlertPriorityEnum, AlertCategoryEnum

class ContractExpirationAnalyzer(BaseAnalyzer):
    @property
    def name(self) -> str:
        return "ContractExpirationAnalyzer"

    async def analyze(self, contract: Contrato) -> List[AlertCandidate]:
        candidates = []
        
        raw = contract.raw_contract or {}
        if is_vigencia_indefinida_status(contract.status):
            return candidates

        # Obter data de fim do payload JSONB (somente raw_contract)
        vigencia_fim_str = raw.get("vigencia_fim")
        
        if not vigencia_fim_str:
            return candidates

        try:
            # Assumindo formato ISO ou similar vindo do Comprasnet
            vigencia_fim = datetime.fromisoformat(vigencia_fim_str.replace("Z", "+00:00"))
            if vigencia_fim.tzinfo is None:
                vigencia_fim = vigencia_fim.replace(tzinfo=timezone.utc)
        except Exception:
            return candidates

        now = datetime.now(timezone.utc)
        diff = (vigencia_fim - now).days

        if diff < 0:
            # Já venceu - opcional: gerar alerta de contrato vencido
            return candidates

        severity = None
        priority = AlertPriorityEnum.NORMAL

        if diff <= 7:
            severity = AlertSeverityEnum.CRITICAL
            priority = AlertPriorityEnum.IMMEDIATE
        elif diff <= 15:
            severity = AlertSeverityEnum.HIGH
            priority = AlertPriorityEnum.HIGH
        elif diff <= 30:
            severity = AlertSeverityEnum.MEDIUM
        elif diff <= 60:
            severity = AlertSeverityEnum.LOW
        elif diff <= 90:
            severity = AlertSeverityEnum.INFO

        if severity:
            candidates.append(AlertCandidate(
                contract_id=contract.id,
                type="contract_expiring",
                category=AlertCategoryEnum.VIGENCIA,
                severity=severity,
                priority=priority,
                title="Contrato Próximo do Vencimento",
                message=f"O contrato {contract.contract_number} vence em {diff} dias ({vigencia_fim.strftime('%d/%m/%Y')}).",
                recommended_action="Avaliar necessidade de renovação ou novo processo licitatório.",
                analyzer_name=self.name,
                metadata_json={"days_remaining": diff, "end_date": vigencia_fim_str}
            ))

        return candidates
