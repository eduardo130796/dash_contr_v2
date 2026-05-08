from pydantic import BaseModel


class DashboardKPIs(BaseModel):
    """KPIs calculados pelo backend para o ExecutiveCockpit."""

    # Volumes de contratos
    totalActive: int
    """Contratos com status 'ativo' (vigencia_fim >= hoje)."""

    expiring30: int
    """Contratos ativos com vencimento em até 30 dias."""

    expiring60: int
    """Contratos ativos com vencimento em até 60 dias."""

    expiring90: int
    """Contratos ativos com vencimento em até 90 dias."""

    expiring180: int
    """Contratos ativos com vencimento em até 180 dias."""

    # Criticidade
    critical: int
    """Contratos com criticidade 'critical' ou 'urgent'."""

    urgent: int
    """Contratos com criticidade 'urgent' (subconjunto de critical)."""

    strategic: int
    """Contratos marcados como estratégicos."""

    # Valor financeiro
    totalValue: float
    """Soma do valor_global de todos os contratos ativos."""

    # Alertas
    activeAlerts: int
    """Total de alertas ativos no sistema."""

    redAlerts: int
    """Alertas com severity = 'red' / nivel 3."""

    # Risco (extras úteis para RiskCenter)
    averageRisk: int
    """Pontuação de risco média do portfólio (0-100)."""

    highRiskCount: int
    """Contratos com risk_score >= 70."""


class DashboardStatsResponse(BaseModel):
    """Payload completo retornado por GET /api/v1/dashboard/stats."""

    kpis: DashboardKPIs
