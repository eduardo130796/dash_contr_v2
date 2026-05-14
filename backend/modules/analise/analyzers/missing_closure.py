from datetime import datetime

from backend.modules.analise.analyzers.base import BaseAnalyzer
from backend.modules.analise.domain.enrichment import is_dataset_ready
from backend.modules.analise.schemas.alert_candidate import AlertCandidate

from backend.modules.alertas.models.enums import (
    AlertCategoryEnum,
    AlertSeverityEnum,
    AlertPriorityEnum,
)


class MissingClosureAnalyzer(BaseAnalyzer):
    """
    Detecta contratos vencidos sem encerramento formal.

    Estratégia:
    - Apenas contratos com histórico enriquecido.
    - Ignora contratos ainda vigentes.
    - Busca evidência formal no histórico.
    - Detecta inconsistência cadastral.
    """

    code = "missing_closure"

    @property
    def name(self) -> str:
        return "MissingClosureAnalyzer"

    async def analyze(self, contract):

        raw = contract.raw_contract or {}

        # ─────────────────────────────────────
        # Histórico precisa existir
        # ─────────────────────────────────────

        if not is_dataset_ready(contract, "historico"):
            return []

        # ─────────────────────────────────────
        # Dados básicos
        # ─────────────────────────────────────

        status = str(
            contract.status or ""
        ).strip().lower()

        vigencia_fim = (
            raw.get("vigencia_fim")
            or raw.get("data_fim")
            or raw.get("fim_vigencia")
        )

        if not vigencia_fim:
            return []

        # ─────────────────────────────────────
        # Parse robusto de data
        # ─────────────────────────────────────

        try:

            raw_date = str(vigencia_fim).strip()

            if "/" in raw_date:

                fim = datetime.strptime(
                    raw_date[:10],
                    "%d/%m/%Y"
                ).date()

            else:

                fim = datetime.strptime(
                    raw_date[:10],
                    "%Y-%m-%d"
                ).date()

        except Exception:
            return []

        today = datetime.now().date()

        # Ainda vigente
        if fim >= today:
            return []

        days_expired = (today - fim).days

        # ─────────────────────────────────────
        # Histórico contratual
        # ─────────────────────────────────────

        historico = contract.raw_historico or []

        if not isinstance(historico, list):
            historico = []

        closure_keywords = [
            "termo de extinção",
            "termo de extincao",
            "encerramento",
            "rescisão",
            "rescisao",
            "distrato",
            "extinção contratual",
            "extincao contratual",
            "finalização contratual",
            "contrato encerrado",
        ]

        has_formal_closure = False

        for item in historico:

            if not isinstance(item, dict):
                continue

            texto = str(
                item.get("observacao") or ""
            ).lower()

            if any(keyword in texto for keyword in closure_keywords):
                has_formal_closure = True
                break

        # ─────────────────────────────────────
        # Severidade dinâmica
        # ─────────────────────────────────────

        severity = AlertSeverityEnum.MEDIUM
        priority = AlertPriorityEnum.NORMAL

        if days_expired >= 30:
            severity = AlertSeverityEnum.HIGH
            priority = AlertPriorityEnum.HIGH

        if days_expired >= 90:
            severity = AlertSeverityEnum.CRITICAL
            priority = AlertPriorityEnum.IMMEDIATE

        # ─────────────────────────────────────
        # Caso 1:
        # Existe termo mas status ativo
        # ─────────────────────────────────────

        if has_formal_closure and status in [
            "ativo",
            "active",
        ]:

            return [
                AlertCandidate(
                    contract_id=contract.id,
                    type="closure_status_inconsistency",
                    category=AlertCategoryEnum.COMPLIANCE,
                    severity=AlertSeverityEnum.MEDIUM,
                    priority=AlertPriorityEnum.NORMAL,
                    title="Status contratual inconsistente",
                    message=(
                        "O contrato possui evidência "
                        "de encerramento formal, mas "
                        "permanece ativo no sistema."
                    ),
                    recommended_action=(
                        "Validar atualização cadastral "
                        "da situação contratual."
                    ),
                    analyzer_name=self.name,
                    metadata_json={
                        "days_expired": days_expired,
                        "vigencia_fim": str(fim),
                        "status": status,
                    },
                )
            ]

        # ─────────────────────────────────────
        # Caso 2:
        # Vencido sem termo
        # ─────────────────────────────────────

        if not has_formal_closure:

            return [
                AlertCandidate(
                    contract_id=contract.id,
                    type="missing_closure",
                    category=AlertCategoryEnum.COMPLIANCE,
                    severity=severity,
                    priority=priority,
                    title="Encerramento formal pendente",
                    message=(
                        f"O contrato está vencido há "
                        f"{days_expired} dias sem "
                        f"evidência de termo formal "
                        f"de encerramento."
                    ),
                    recommended_action=(
                        "Verificar encerramento contratual "
                        "e formalizar termo de extinção."
                    ),
                    analyzer_name=self.name,
                    metadata_json={
                        "days_expired": days_expired,
                        "vigencia_fim": str(fim),
                        "status": status,
                    },
                )
            ]

        return []