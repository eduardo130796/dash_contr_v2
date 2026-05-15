from pydantic import BaseModel


class DashboardKPIs(BaseModel):
    """KPIs calculados pelo backend para o ExecutiveCockpit."""

    # Volumes de contratos
    totalActive: int
    """Contratos (tipo instrumento = contrato) no portfólio executivo — ver `ativo_rules.is_contrato_executivo_kpi_row`."""

    activeEmpenhos: int = 0
    """Empenhos / ordens no mesmo critério de portfólio ativo (tipo empenho)."""

    activeAtas: int = 0
    """Atas no mesmo critério de portfólio ativo (tipo ata)."""

    expiring30: int
    """Contratos ativos com vencimento em até 30 dias."""

    expiring60: int
    """Contratos ativos com vencimento em até 60 dias."""

    expiring90: int
    """Contratos ativos com vencimento em até 90 dias."""

    expiring180: int
    """Contratos ativos com vencimento em até 180 dias."""

    # Criticidade Operacional
    critica: int
    """Contratos com criticidade 'crítica'."""

    urgente: int
    """Contratos com criticidade 'urgente'."""

    atencao: int
    """Contratos com criticidade 'atenção'."""

    normal: int
    """Contratos com criticidade 'normal'."""

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

class ExpirationTimelineItem(BaseModel):
    """Quantidade de contratos vencendo por mês."""
    mes: str
    quantidade: int

class UrgentAction(BaseModel):
    """Ação urgente baseada em alerta crítico."""
    id: str | None
    contract_id: str | None
    contract_number: str | None
    contract_object: str | None
    title: str
    severity: str
    priority: str
    recommended_action: str | None
    days_remaining: int | None

class ExecutiveInsight(BaseModel):
    """Insight estratégico gerado pelo backend."""
    type: str
    title: str
    description: str
    severity: str

class UnitAggregation(BaseModel):
    """Agregação de contratos por unidade gestora."""
    unit: str
    total_contracts: int
    critical_contracts: int
    expiring_contracts: int

class ExpirationTimelineDetail(BaseModel):
    """Item detalhado da linha do tempo de vencimentos."""
    contract_id: str | None
    contract_number: str
    contract_object: str | None
    days_remaining: int
    priority: str
    expiration_date: str

class ClosurePendingSummary(BaseModel):
    total: int = 0
    critical: int = 0

class DashboardStatsResponse(BaseModel):
    """Payload completo retornado por GET /api/v1/dashboard/stats."""

    kpis: DashboardKPIs
    expirationTimeline: list[ExpirationTimelineItem] = []
    urgent_actions: list[UrgentAction] = []
    executive_insights: list[ExecutiveInsight] = []
    contracts_by_unit: list[UnitAggregation] = []
    expiration_timeline: list[ExpirationTimelineDetail] = []
    closure_pending: ClosurePendingSummary | None = None
