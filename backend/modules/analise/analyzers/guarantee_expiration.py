from datetime import datetime, timezone

from backend.modules.analise.analyzers.base import BaseAnalyzer
from backend.modules.analise.schemas.alert_candidate import AlertCandidate
from backend.modules.alertas.models.enums import (
    AlertCategoryEnum,
    AlertSeverityEnum,
    AlertPriorityEnum,
)


class GuaranteeExpirationAnalyzer(BaseAnalyzer):
    """
    Detecta garantias próximas do vencimento.
    """

    code = "guarantee_expiration"
    name = "GuaranteeExpirationAnalyzer"

    async def analyze(self, contract) -> list[AlertCandidate]:

        garantias = contract.raw_garantias or []

        if not garantias or not isinstance(garantias, list):
            return []

        now = datetime.now(timezone.utc)

        alerts = []

        for garantia in garantias:

            vencimento = garantia.get("vencimento")

            if not vencimento:
                continue

            try:
                fim = datetime.fromisoformat(vencimento).replace(tzinfo=timezone.utc)
            except Exception:
                continue

            days_remaining = (fim - now).days

            if days_remaining < 0:
                continue

            severity = None

            if days_remaining <= 7:
                severity = AlertSeverityEnum.CRITICAL
            elif days_remaining <= 15:
                severity = AlertSeverityEnum.HIGH
            elif days_remaining <= 30:
                severity = AlertSeverityEnum.MEDIUM

            if not severity:
                continue

            alerts.append(
                AlertCandidate(
                    contract_id=contract.id,
                    type="guarantee_expiration",
                    category=AlertCategoryEnum.COMPLIANCE,
                    severity=severity,
                    priority=AlertPriorityEnum.HIGH,
                    title="Garantia próxima do vencimento",
                    message=f"A garantia contratual vence em {days_remaining} dias.",
                    recommended_action="Avaliar renovação ou atualização da garantia.",
                    analyzer_name=self.name,
                    metadata={
                        "days_remaining": days_remaining,
                        "garantia_tipo": garantia.get("tipo"),
                        "garantia_vencimento": vencimento,
                    },
                )
            )

        return alerts