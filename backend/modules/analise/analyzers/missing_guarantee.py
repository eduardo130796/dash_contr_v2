from datetime import datetime

from backend.modules.analise.analyzers.base import BaseAnalyzer
from backend.modules.analise.schemas.alert_candidate import AlertCandidate
from backend.modules.alertas.models.enums import (
    AlertCategoryEnum,
    AlertSeverityEnum,
    AlertPriorityEnum,
)


class MissingGuaranteeAnalyzer(BaseAnalyzer):
    """
    Detecta contratos ativos sem garantia cadastrada.

    Regras:
    - Ignora contratos encerrados.
    - Ignora locação de imóveis (não exigem garantia).
    - Gera alerta quando não existir garantia válida.
    """

    code = "missing_guarantee"
    name = "MissingGuaranteeAnalyzer"

    async def analyze(self, contract) -> list[AlertCandidate]:

        if not contract:
            return []

        raw = contract.raw_contract or {}

        status = str(contract.status or "").strip().lower()
        objeto = str(raw.get("objeto") or "").strip().lower()
        categoria = str(raw.get("categoria") or "").strip().lower()

        # Ignorar contratos encerrados
        if status in ["encerrado", "finalizado", "rescindido"]:
            return []

        # 🔥 EXCEÇÃO IMPORTANTE
        # Locação de imóveis normalmente não exige garantia
        if (
            "locação de imóvel" in objeto
            or "locacao de imovel" in objeto
            or "locação" in categoria
            or "locacao" in categoria
        ):
            return []

        garantias = contract.raw_garantias or []

        if isinstance(garantias, str):
            return []

        garantias_validas = []

        for garantia in garantias:

            if not isinstance(garantia, dict):
                continue

            tipo = str(garantia.get("tipo") or "").strip()

            if tipo:
                garantias_validas.append(garantia)

        if garantias_validas:
            return []

        return [
            AlertCandidate(
                contract_id=contract.id,
                type="missing_guarantee",
                category=AlertCategoryEnum.COMPLIANCE,
                severity=AlertSeverityEnum.HIGH,
                priority=AlertPriorityEnum.HIGH,
                title="Garantia não cadastrada",
                message="O contrato não possui garantia registrada.",
                recommended_action="Validar a obrigatoriedade e registrar a garantia contratual.",
                analyzer_name=self.name,
                metadata={
                    "generated_at": datetime.utcnow().isoformat()
                },
            )
        ]