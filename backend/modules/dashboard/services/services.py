from datetime import date, timedelta, timezone, datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, cast, Integer, case, and_, or_
from sqlalchemy.dialects.postgresql import JSONB

from backend.core.logging.logger import log
from backend.modules.contratos.models.models import Contrato
from backend.modules.dashboard.schemas.schemas import DashboardKPIs, DashboardStatsResponse


class DashboardService:
    """
    Centraliza todos os cálculos de KPIs do Dashboard Executivo.

    Regras de negócio consolidadas aqui (antes dispersas no DataContext.jsx):
    - Contratos ativos: is_active = True
    - Vencimento: cast do campo JSONB raw_contract->>'vigencia_fim' como DATE
    - Valor financeiro: raw_contract->>'valor_global' (fallback: valor_inicial)
    - Criticidade: derivada do campo analysis->>'criticality' ou risk_score
    - Status normalizado: gravado na coluna `status` pelo sincronizador
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_stats(self) -> DashboardStatsResponse:
        log.info("Calculando stats do dashboard")

        today = datetime.now(timezone.utc).date()

        # ──────────────────────────────────────────────────────────────────────
        # Query principal: busca todos os contratos ativos com campos JSONB
        # necessários para os cálculos de KPI.
        # Usamos uma única query para evitar N+1 e minimizar roundtrips ao banco.
        # ──────────────────────────────────────────────────────────────────────
        result = await self.session.execute(
            select(
                Contrato.id,
                Contrato.is_active,
                Contrato.status,
                Contrato.analysis,
                Contrato.raw_contract,
            )
        )
        rows = result.all()

        # ──────────────────────────────────────────────────────────────────────
        # Processamento Python-side (mais legível e portável que SQL puro
        # para extrações de JSONB aninhado com múltiplos fallbacks)
        # ──────────────────────────────────────────────────────────────────────
        total_active = 0
        expiring30 = 0
        expiring60 = 0
        expiring90 = 0
        expiring180 = 0
        critical = 0
        urgent = 0
        strategic = 0
        total_value = 0.0
        average_risk_sum = 0
        high_risk_count = 0
        risk_count = 0

        for row in rows:
            is_active = row.is_active
            raw = row.raw_contract or {}
            analysis = row.analysis or {}

            # ── Vigência ──────────────────────────────────────────────────────
            vigencia_fim = self._parse_date(raw.get("vigencia_fim"))

            # Considera ativo se is_active=True OU status não é 'encerrado'
            # (o sincronizador marca is_active baseado na vigencia_fim)
            contrato_ativo = is_active or (
                row.status not in ("encerrado", "vencido")
            )

            if not contrato_ativo:
                continue

            total_active += 1

            # ── Vencimento em N dias ──────────────────────────────────────────
            if vigencia_fim and vigencia_fim >= today:
                days_remaining = (vigencia_fim - today).days
                if days_remaining <= 30:
                    expiring30 += 1
                if days_remaining <= 60:
                    expiring60 += 1
                if days_remaining <= 90:
                    expiring90 += 1
                if days_remaining <= 180:
                    expiring180 += 1

            # ── Criticidade ────────────────────────────────────────────────────
            # Fonte primária: campo `analysis.criticality` (calculado pelo engine)
            # Fonte fallback: risk_score via regras do mockData (compatibilidade)
            criticality = (
                analysis.get("criticality")
                or self._derive_criticality_from_risk(
                    analysis.get("risk_score") or raw.get("risk_score")
                )
            )
            if criticality in ("critical", "urgent"):
                critical += 1
            if criticality == "urgent":
                urgent += 1

            # ── Estratégico ────────────────────────────────────────────────────
            is_strategic = (
                analysis.get("is_strategic")
                or raw.get("is_strategic")
                or False
            )
            if is_strategic:
                strategic += 1

            # ── Valor financeiro ───────────────────────────────────────────────
            # Ordem de precedência: valor_global > valor_inicial > 0
            value = self._parse_float(
                raw.get("valor_global") or raw.get("valor_inicial")
            )
            total_value += value

            # ── Risco ──────────────────────────────────────────────────────────
            risk_score = self._parse_int(
                analysis.get("risk_score") or raw.get("risk_score")
            )
            if risk_score is not None:
                average_risk_sum += risk_score
                risk_count += 1
                if risk_score >= 70:
                    high_risk_count += 1

        avg_risk = round(average_risk_sum / risk_count) if risk_count > 0 else 0

        # ── Alertas ────────────────────────────────────────────────────────────
        # Módulo de alertas ainda não implementado no backend.
        # Retornamos 0 até o módulo `alertas` estar ativo.
        # Quando implementado, substituir por: await self._count_alerts()
        active_alerts, red_alerts = await self._count_alerts()

        kpis = DashboardKPIs(
            totalActive=total_active,
            expiring30=expiring30,
            expiring60=expiring60,
            expiring90=expiring90,
            expiring180=expiring180,
            critical=critical,
            urgent=urgent,
            strategic=strategic,
            totalValue=total_value,
            activeAlerts=active_alerts,
            redAlerts=red_alerts,
            averageRisk=avg_risk,
            highRiskCount=high_risk_count,
        )

        log.info(
            "Stats calculados",
            totalActive=kpis.totalActive,
            expiring30=kpis.expiring30,
            critical=kpis.critical,
            totalValue=kpis.totalValue,
        )

        return DashboardStatsResponse(kpis=kpis)

    # ──────────────────────────────────────────────────────────────────────────
    # Helpers privados
    # ──────────────────────────────────────────────────────────────────────────

    def _parse_date(self, value) -> date | None:
        """Converte string ISO 'YYYY-MM-DD' ou 'YYYY-MM-DDTHH:MM:SS' para date."""
        if not value:
            return None
        try:
            return date.fromisoformat(str(value)[:10])
        except (ValueError, TypeError):
            return None

    def _parse_float(self, value) -> float:
        """Converte string ou número para float, retornando 0.0 em caso de falha."""
        if value is None:
            return 0.0
        try:
            return float(str(value).replace(",", "."))
        except (ValueError, TypeError):
            return 0.0

    def _parse_int(self, value) -> int | None:
        """Converte valor para int, retornando None em caso de falha."""
        if value is None:
            return None
        try:
            return int(float(str(value)))
        except (ValueError, TypeError):
            return None

    def _derive_criticality_from_risk(self, risk_score) -> str:
        """
        Regra de fallback: deriva criticidade a partir do risk_score.
        Mantém compatibilidade com a lógica que estava no mockData.js do frontend.
        Quando o motor de análise estiver ativo, este método se tornará obsoleto.
        """
        score = self._parse_int(risk_score)
        if score is None:
            return "low"
        if score >= 75:
            return "urgent"
        if score >= 50:
            return "critical"
        if score >= 30:
            return "attention"
        return "low"

    async def _count_alerts(self) -> tuple[int, int]:
        """
        Conta alertas ativos no sistema.
        Quando o módulo `alertas` estiver implementado, fará SELECT na tabela real.
        Por ora, retorna (0, 0) como placeholder seguro.
        """
        try:
            from backend.modules.alertas.models.models import Alerta  # noqa
            result = await self.session.execute(
                select(func.count()).where(Alerta.status == "active")
            )
            total = result.scalar() or 0

            red_result = await self.session.execute(
                select(func.count()).where(
                    and_(Alerta.status == "active", Alerta.severity == "red")
                )
            )
            red = red_result.scalar() or 0
            return int(total), int(red)
        except Exception:
            # Módulo alertas ainda não disponível — retorna zeros sem quebrar
            return 0, 0
