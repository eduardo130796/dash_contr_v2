from typing import List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import (
    func,
    or_,
    and_,
    cast,
    String,
    desc,
    asc,
    case,
)

from backend.core.logging.logger import log
from backend.modules.contratos.models.models import Contrato
from backend.modules.contratos.domain.ativo_rules import (
    TERMINAL_STATUSES,
    is_contrato_executivo_kpi_row,
    normalized_tipo_instrumento,
)
from backend.modules.alertas.models.models import Alerta
from backend.modules.alertas.models.enums import AlertStatusEnum


class ContratoRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    @staticmethod
    def _tipo_normalized_sql():
        """Espelha `normalized_tipo_instrumento` no SQL (lower + btrim + coalesce)."""
        return func.lower(
            func.btrim(func.coalesce(Contrato.raw_contract["tipo"].astext, ""))
        )

    def _build_contract_filters(
        self,
        *,
        instrument_kind: Optional[str],
        status: Optional[str],
        criticality: Optional[str],
        category: Optional[str],
        search: Optional[str],
    ) -> list:
        filters: list = []
        ik = (instrument_kind or "contrato").strip().lower()
        tn = self._tipo_normalized_sql()

        if ik == "all":
            pass
        elif ik in ("empenho", "empenhos"):
            filters.append(
                or_(
                    tn.in_(("empenho", "empenhos")),
                    tn.like("empenho %"),
                    tn.like("empenhos %"),
                )
            )
        elif ik in ("ata", "atas"):
            filters.append(
                or_(
                    tn.in_(("ata", "atas")),
                    tn.like("ata %"),
                    tn.like("atas %"),
                )
            )
        else:
            filters.append(or_(tn == "contrato", tn.like("contrato %")))

        if status and status != "all":
            filters.append(Contrato.status == status)
        elif status == "all":
            pass
        elif not status:
            st = func.lower(func.coalesce(Contrato.status, ""))
            terminals = tuple(sorted(TERMINAL_STATUSES))
            filters.append(
                or_(
                    Contrato.is_active.is_(True),
                    Contrato.status.is_(None),
                    ~st.in_(terminals),
                )
            )

        if criticality and criticality != "all":
            filters.append(Contrato.analysis["criticality"].astext == criticality)

        if category and category != "all":
            filters.append(
                or_(
                    Contrato.raw_contract["categoria"].astext == category,
                    Contrato.analysis["category"].astext == category,
                )
            )

        if search:
            search_term = f"%{search}%"
            filters.append(
                or_(
                    Contrato.contract_number.ilike(search_term),
                    Contrato.raw_contract["objeto"].astext.ilike(search_term),
                    Contrato.raw_contract["fornecedor"]["nome"].astext.ilike(search_term),
                    Contrato.raw_contract["processo"].astext.ilike(search_term),
                    Contrato.raw_contract["unidade_compra"]["nome"].astext.ilike(search_term),
                )
            )

        return filters

    async def aggregate_portfolio_composition_by_normalized_tipo(
        self,
        *,
        status: Optional[str] = None,
        criticality: Optional[str] = None,
        category: Optional[str] = None,
        search: Optional[str] = None,
    ) -> list[tuple[str, int]]:
        """
        Distribuição dinâmica do portfólio por tipo normalizado (sem filtro de instrument_kind).
        Mesmos predicados de situação / busca / criticidade / categoria que a listagem.
        Retorna lista (normalized_tipo, count) ordenada por count desc.
        """
        filters = self._build_contract_filters(
            instrument_kind="all",
            status=status,
            criticality=criticality,
            category=category,
            search=search,
        )
        tn = self._tipo_normalized_sql()
        cnt = func.count().label("cnt")
        stmt = select(tn.label("normalized_tipo"), cnt).select_from(Contrato)
        if filters:
            stmt = stmt.where(and_(*filters))
        stmt = stmt.group_by(tn).order_by(desc(cnt))

        result = await self.session.execute(stmt)
        rows = []
        for row in result.all():
            nt = row[0] if row[0] is not None else ""
            rows.append((str(nt), int(row[1])))

        log.debug(
            "portfolio_composition_by_normalized_tipo",
            buckets=[{"normalized_tipo": k or "(vazio)", "count": v} for k, v in rows],
            total_rows=sum(v for _, v in rows),
        )

        # Amostra raw vs normalizado para auditoria (não agrupada)
        sample_stmt = select(
            Contrato.raw_contract["tipo"].astext.label("raw_tipo"),
            tn.label("normalized_tipo"),
        ).select_from(Contrato)
        if filters:
            sample_stmt = sample_stmt.where(and_(*filters))
        sample_stmt = sample_stmt.limit(80)
        sample_res = await self.session.execute(sample_stmt)
        log.debug(
            "portfolio_tipo_audit_sample",
            rows=[
                {
                    "raw_contract_tipo": s[0],
                    "normalized_tipo": (s[1] or "") if s[1] is not None else "",
                }
                for s in sample_res.all()
            ],
        )

        return rows

    async def get_by_id(self, contrato_id: str) -> Optional[Contrato]:
        result = await self.session.execute(
            select(Contrato).filter(Contrato.id == contrato_id)
        )
        return result.scalars().first()

    async def get_by_external_id(self, external_id: str) -> Optional[Contrato]:
        result = await self.session.execute(
            select(Contrato).filter(Contrato.external_id == external_id)
        )
        return result.scalars().first()

    async def list_contracts(
        self,
        page: int = 1,
        limit: int = 20,
        search: Optional[str] = None,
        status: Optional[str] = None,
        criticality: Optional[str] = None,
        category: Optional[str] = None,
        sort_by: str = "vigencia_fim",
        order: str = "desc",
        instrument_kind: Optional[str] = None,
    ) -> Tuple[List[Contrato], int]:
        """
        Lista contratos com filtros, busca e paginação.
        Retorna (lista_de_contratos, total_de_registros).

        `instrument_kind` (padrão `contrato`): alinha o escopo ao Painel Executivo.
        `status` ausente: aplica o mesmo critério de portfólio do dashboard
        (`ativo_rules.is_portfolio_row_active` espelhado em SQL).
        `status=all`: não filtra por coluna `status` (lista ampla).
        """
        ik = (instrument_kind or "contrato").strip().lower()
        filters = self._build_contract_filters(
            instrument_kind=instrument_kind,
            status=status,
            criticality=criticality,
            category=category,
            search=search,
        )
        severity_rank = (
            func.max(
                case(
                    (
                        Alerta.severity == "critical",
                        4,
                    ),
                    (
                        Alerta.severity == "high",
                        3,
                    ),
                    (
                        Alerta.severity == "medium",
                        2,
                    ),
                    else_=1,
                )
            )
        ).label("severity_rank")

        alerts_subquery = (
            select(
                Alerta.contract_id.label("contract_id"),
                func.count(Alerta.id).label("alerts_count"),
                severity_rank,
            )
            .where(
                Alerta.status.in_(
                    [
                        AlertStatusEnum.ACTIVE,
                        AlertStatusEnum.VIEWED,
                    ]
                )
            )
            .group_by(Alerta.contract_id)
            .subquery()
        )

        query = (
            select(
                Contrato,
                alerts_subquery.c.alerts_count,
                alerts_subquery.c.severity_rank,
            )
            .outerjoin(
                alerts_subquery,
                Contrato.id == alerts_subquery.c.contract_id,
            )
        )

        if filters:
            query = query.where(and_(*filters))

        # ── Total Count: mesma árvore de filtros da listagem ─────────────────
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.session.execute(count_query)
        total = total_result.scalar() or 0

        # ── Ordenação ─────────────────────────────────────────────────────────
        sort_attr = None
        if sort_by == "contract_number":
            sort_attr = Contrato.contract_number
        elif sort_by == "risk_score":
            sort_attr = cast(Contrato.analysis["risk_score"].astext, String)
        elif sort_by == "valor_global":
            sort_attr = Contrato.raw_contract["valor_global"].astext
        elif sort_by == "fornecedor":
            sort_attr = Contrato.raw_contract["fornecedor"]["nome"].astext
        else:
            # Usa a coluna física indexável para ordenação eficiente no PG
            sort_attr = Contrato.vigencia_fim

        if order == "desc":
            query = query.order_by(desc(sort_attr))
        else:
            query = query.order_by(asc(sort_attr))

        query = query.offset((page - 1) * limit).limit(limit)

        result = await self.session.execute(query)
        rows = result.all()

        items = []

        for contrato, alerts_count, severity_rank in rows:

            highest_alert_severity = None

            if severity_rank == 4:
                highest_alert_severity = "critical"
            elif severity_rank == 3:
                highest_alert_severity = "high"
            elif severity_rank == 2:
                highest_alert_severity = "medium"
            elif severity_rank == 1:
                highest_alert_severity = "low"

            contrato.alerts_count = alerts_count or 0
            contrato.highest_alert_severity = highest_alert_severity

            items.append(contrato)

        log.debug(
            "contracts_list_result",
            instrument_kind=ik,
            page=page,
            limit=limit,
            total=total,
            page_rows=len(items),
            sample=[
                {
                    "contract_id": c.id,
                    "normalized_tipo": normalized_tipo_instrumento(c.raw_contract or {}),
                    "status": c.status,
                    "is_active": c.is_active,
                    "matches_executivo_kpi": is_contrato_executivo_kpi_row(
                        c.is_active, c.status, c.raw_contract or {}
                    ),
                }
                for c in items[:20]
            ],
        )

        return items, total

    async def create(self, contrato: Contrato) -> Contrato:
        self.session.add(contrato)
        await self.session.commit()
        await self.session.refresh(contrato)
        return contrato

    async def update(self, contrato: Contrato) -> Contrato:
        await self.session.commit()
        await self.session.refresh(contrato)
        return contrato
