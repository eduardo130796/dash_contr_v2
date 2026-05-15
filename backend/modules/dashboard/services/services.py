from backend import update_schema
from datetime import date, timedelta, timezone, datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, cast, Integer, case, and_, or_
from sqlalchemy.dialects.postgresql import JSONB

from backend.core.logging.logger import log
from backend.modules.contratos.models.models import Contrato
from backend.modules.contratos.domain.ativo_rules import (
    counts_in_expiration_views,
    is_ata_kpi_row,
    is_contrato_executivo_kpi_row,
    is_empenho_kpi_row,
)
from backend.modules.dashboard.schemas.schemas import DashboardKPIs, DashboardStatsResponse


class DashboardService:
    """
    Centraliza todos os cálculos de KPIs do Dashboard Executivo.

    Regras de negócio consolidadas aqui (antes dispersas no DataContext.jsx):
    - Contratos ativos (KPI): `ativo_rules.is_contrato_executivo_kpi_row` (SSOT compartilhado com listagem)
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
                Contrato.empenhos_status,
                Contrato.faturas_status,
                Contrato.historico_status,
            )
        )
        rows = result.all()

        # ──────────────────────────────────────────────────────────────────────
        # Processamento Python-side (mais legível e portável que SQL puro
        # para extrações de JSONB aninhado com múltiplos fallbacks)
        # ──────────────────────────────────────────────────────────────────────
        total_active = 0
        active_empenhos = 0
        active_atas = 0
        expiring30 = 0
        expiring60 = 0
        expiring90 = 0
        expiring180 = 0
        critica = 0
        urgente = 0
        atencao = 0
        normal = 0
        total_value = 0.0
        average_risk_sum = 0
        high_risk_count = 0
        risk_count = 0
        expiration_timeline = {}

        for row in rows:
            is_active = row.is_active
            raw = row.raw_contract or {}
            analysis = row.analysis or {}
            if is_empenho_kpi_row(is_active, row.status, raw):
                active_empenhos += 1
            if is_ata_kpi_row(is_active, row.status, raw):
                active_atas += 1

            if not is_contrato_executivo_kpi_row(is_active, row.status, raw):
                continue

            # ── Vigência (somente raw_contract.vigencia_fim) ─────────────────
            vigencia_fim = self._parse_date(raw.get("vigencia_fim"))

            total_active += 1

            # ── Vencimento em N dias (exclui vigência indeterminada) ───────────
            if counts_in_expiration_views(row.status, vigencia_fim, today):
                days_remaining = (vigencia_fim - today).days
                month_key = vigencia_fim.strftime("%m/%Y")

                expiration_timeline[month_key] = (
                    expiration_timeline.get(month_key, 0) + 1
                )
                if days_remaining <= 30:
                    expiring30 += 1
                if days_remaining <= 60:
                    expiring60 += 1
                if days_remaining <= 90:
                    expiring90 += 1
                if days_remaining <= 180:
                    expiring180 += 1

            # ── Criticidade Operacional ─────────────────────────────────────────
            # Fonte primária: campo `analysis.criticidade`
            criticality = analysis.get("criticidade") or "normal"
            if criticality == "crítica":
                critica += 1
            elif criticality == "urgente":
                urgente += 1
            elif criticality == "atenção":
                atencao += 1
            else:
                normal += 1

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

        timeline_sorted = [
            {
                "mes": mes,
                "quantidade": quantidade
            }
            for mes, quantidade in sorted(
                expiration_timeline.items(),
                key=lambda x: datetime.strptime(x[0], "%m/%Y")
            )
        ]

        kpis = DashboardKPIs(
            totalActive=total_active,
            activeEmpenhos=active_empenhos,
            activeAtas=active_atas,
            expiring30=expiring30,
            expiring60=expiring60,
            expiring90=expiring90,
            expiring180=expiring180,
            critica=critica,
            urgente=urgente,
            atencao=atencao,
            normal=normal,
            totalValue=total_value,
            activeAlerts=active_alerts,
            redAlerts=red_alerts,
            averageRisk=avg_risk,
            highRiskCount=high_risk_count,
        )

        # ── Novas Seções Analíticas (Resilientes) ──────────────────────────
        try:
            urgent_actions = await self._get_urgent_actions()
        except Exception:
            log.exception("Erro ao buscar ações urgentes para o dashboard")
            urgent_actions = []

        try:
            executive_insights = await self._generate_executive_insights(kpis, rows)
        except Exception:
            log.exception("Erro ao gerar insights executivos para o dashboard")
            executive_insights = []

        try:
            closure_pending = await self._process_closure_pending()
            _, expiration_detail = self._process_units_and_timeline(rows, today)

        except Exception:
            log.exception("Erro ao processar pendências de encerramento")
            closure_pending = {
                "total": 0,
                "critical": 0,
            }
            expiration_detail = []

        log.info(
            "Stats calculados",
            totalActive=kpis.totalActive,
            activeAlerts=kpis.activeAlerts,
            insights=len(executive_insights),
        )

        return DashboardStatsResponse(
            kpis=kpis,
            expirationTimeline=timeline_sorted,
            urgent_actions=urgent_actions,
            executive_insights=executive_insights,
            closure_pending=closure_pending,
            expiration_timeline=expiration_detail
        )

    async def _get_urgent_actions(self) -> list:
        """Busca os 6 alertas mais críticos e urgentes para o cockpit."""
        try:
            from backend.modules.alertas.models.models import Alerta
            from sqlalchemy import desc

            # Prioridades que consideramos "urgentes" para o cockpit
            URGENT_ACTION_TYPES = {
                "contract_expiration",
                "guarantee_expiration",
            }

            stmt = (
                select(Alerta, Contrato.contract_number, Contrato.raw_contract)
                .join(Contrato, Alerta.contract_id == Contrato.id)
                .where(Alerta.status == "active")
                .where(Alerta.type.in_(URGENT_ACTION_TYPES))
                .order_by(
                    case(
                        (Alerta.severity == "critical", 1),
                        (Alerta.severity == "high", 2),
                        else_=3
                    ),
                    desc(Alerta.created_at)
                )
                .limit(12)
            )
            result = await self.session.execute(stmt)
            actions = []
            for alert, contract_number, raw_contract in result.all():
                obj = (raw_contract or {}).get("objeto") or "Objeto não informado"
                actions.append({
                    "id": alert.id,
                    "contract_id": alert.contract_id,
                    "contract_number": contract_number,
                    "contract_object": obj[:100] + ("..." if len(obj) > 100 else ""),
                    "title": alert.title,
                    "severity": alert.severity,
                    "priority": alert.priority,
                    "recommended_action": alert.recommended_action,
                    "days_remaining": None
                })
            grouped = {}

            for action in actions:

                key = action.get("title")

                if key not in grouped:
                    grouped[key] = []

                grouped[key].append(action)

            curated = []

            for group in grouped.values():
                curated.extend(group[:2])

            return curated[:6]
            
        except Exception as e:
            log.error(f"Erro ao buscar ações urgentes: {e}")
            return []

    async def _generate_executive_insights(self, kpis: DashboardKPIs, rows: list) -> list:
        """Gera insights estratégicos baseados nos dados atuais."""
        from backend.modules.alertas.models.models import Alerta
        insights = []
        missing_guarantee = 0
        missing_responsible = 0
        missing_closure = 0

        active_alerts = []

        try:

            result = await self.session.execute(
                select(Alerta).where(
                    Alerta.status == "active"
                )
            )

            active_alerts = result.scalars().all()

        except Exception:
            pass

        for alert in active_alerts:

            if alert.type == "missing_guarantee":
                missing_guarantee += 1

            elif alert.type == "missing_responsible":
                missing_responsible += 1

            elif alert.type == "missing_closure":
                missing_closure += 1

        # Insight 1: Pico de vencimentos
        if kpis.expiring90 > 5:
            insights.append({
                "type": "renewal_peak",
                "title": f"Pico de Vencimentos Próximo",
                "description": f"{kpis.expiring90} contratos vencem em até 90 dias. Inicie o planejamento orçamentário.",
                "severity": "medium" if kpis.expiring90 < 15 else "high"
            })

        # Insight 2: Alertas Críticos
        if kpis.redAlerts > 0:
            insights.append({
                "type": "critical_risk",
                "title": "Atenção: Alertas Críticos Ativos",
                "description": f"Existem {kpis.redAlerts} alertas de máxima severidade que requerem intervenção imediata.",
                "severity": "critical"
            })

        # Insight 3: Falhas de Sincronização
        sync_failures = sum(
            1
            for r in rows
            if is_contrato_executivo_kpi_row(r.is_active, r.status, r.raw_contract or {})
            and any(
                s == "failed"
                for s in [
                    r.empenhos_status,
                    r.faturas_status,
                    r.historico_status,
                ]
            )
        )
        if sync_failures > 0:
            insights.append({
                "type": "sync_issue",
                "title": "Inconsistência de Dados (Sync)",
                "description": f"{sync_failures} contratos com falha na atualização de dados governamentais.",
                "severity": "low"
            })


        if missing_guarantee > 0:
            insights.append({
                "type": "missing_guarantee",
                "title": "Garantias pendentes",
                "description": f"{missing_guarantee} contratos sem garantia cadastrada.",
                "severity": "medium"
            })

        if missing_responsible > 0:
            insights.append({
                "type": "missing_responsible",
                "title": "Responsáveis ausentes",
                "description": f"{missing_responsible} contratos sem responsável definido.",
                "severity": "medium"
            })

        if missing_closure > 0:
            insights.append({
                "type": "missing_closure",
                "title": "Pendências de encerramento",
                "description": f"{missing_closure} contratos vencidos permanecem ativos.",
                "severity": "high"
            })

    
        # Insight Default se não houver problemas
        if not insights:
            insights.append({
                "type": "healthy",
                "title": "Operação Estável",
                "description": "Nenhuma anomalia crítica detectada no portfólio hoje.",
                "severity": "info"
            })

        return insights[:3] # Retorna no máximo 3 insights

    def _process_units_and_timeline(self, rows: list, today: date) -> tuple:
        """Processa agregações por unidade e lista detalhada de vencimentos."""
        units = {}
        timeline = []

        for row in rows:
            raw = row.raw_contract or {}
            analysis = row.analysis or {}

            if not is_contrato_executivo_kpi_row(row.is_active, row.status, raw):
                continue

            # Unidade
            unit_name = raw.get("unidade_compra") or raw.get("orgao") or "Não Informado"
            if unit_name not in units:
                units[unit_name] = {"total": 0, "critical": 0, "expiring": 0}
            
            units[unit_name]["total"] += 1
            
            # Vencimento (exclui vigência indeterminada da timeline operacional)
            vigencia_fim = self._parse_date(raw.get("vigencia_fim"))
            if counts_in_expiration_views(row.status, vigencia_fim, today):
                days = (vigencia_fim - today).days
                if 0 <= days <= 180:
                    priority = self._calculate_priority(days)
                    obj = raw.get("objeto") or "Objeto não informado"
                    
                    timeline.append({
                        "contract_id": row.id,
                        "contract_number": raw.get("numero") or "S/N",
                        "contract_object": obj[:100] + ("..." if len(obj) > 100 else ""),
                        "days_remaining": days,
                        "priority": priority,
                        "expiration_date": vigencia_fim.isoformat()
                    })
                    
                    if days <= 30:
                        units[unit_name]["expiring"] += 1

            # Criticidade por Unidade
            criticality = analysis.get("criticidade")
            if criticality in ("crítica", "urgente"):
                units[unit_name]["critical"] += 1

        # Formata Units
        unit_aggs = [
            {
                "unit": name,
                "total_contracts": data["total"],
                "critical_contracts": data["critical"],
                "expiring_contracts": data["expiring"]
            }
            for name, data in sorted(units.items(), key=lambda x: x[1]["total"], reverse=True)
        ][:10]

        # Formata Timeline (ordenada por proximidade)
        timeline_sorted = sorted(timeline, key=lambda x: x["days_remaining"])[:15]

        return unit_aggs, timeline_sorted

    async def _process_closure_pending(self) -> dict:

        try:

            from backend.modules.alertas.models.models import Alerta

            result = await self.session.execute(
                select(
                    Alerta.severity
                ).where(
                    Alerta.status == "active",
                    Alerta.type == "missing_closure",
                )
            )

            rows = result.all()

            total = len(rows)

            critical = sum(
                1
                for row in rows
                if row.severity in ["high", "critical"]
            )

            return {
                "total": total,
                "critical": critical,
            }

        except Exception:

            log.exception(
                "Erro ao calcular pendências de encerramento"
            )

            return {
                "total": 0,
                "critical": 0,
            }


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

    def _calculate_priority(self, days: int) -> str:
        """Determina a prioridade operacional baseada em dias para o vencimento."""
        if days <= 7: return "crítica"
        if days <= 15: return "urgente"
        if days <= 30: return "atenção"
        return "normal"

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
                    and_(Alerta.status == "active", Alerta.severity == "critical")
                )
            )
            red = red_result.scalar() or 0
            return int(total), int(red)
        except Exception:
            # Módulo alertas ainda não disponível — retorna zeros sem quebrar
            return 0, 0
