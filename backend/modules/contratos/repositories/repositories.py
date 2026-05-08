from typing import List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, or_, and_, cast, String, desc, asc
from sqlalchemy.dialects.postgresql import JSONB

from backend.modules.contratos.models.models import Contrato


class ContratoRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

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
    ) -> Tuple[List[Contrato], int]:
        """
        Lista contratos com filtros, busca e paginação.
        Retorna (lista_de_contratos, total_de_registros).
        """
        query = select(Contrato)

        # ── Filtros ───────────────────────────────────────────────────────────
        filters = []

        if status and status != "all":
            filters.append(Contrato.status == status)
        elif not status:
            # Comportamento padrão: apenas ativos
            filters.append(Contrato.status == "ativo")

        if criticality and criticality != "all":
            filters.append(Contrato.analysis["criticality"].astext == criticality)

        if category and category != "all":
            # Categoria costuma vir no raw_contract ou analysis
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

        if filters:
            query = query.where(and_(*filters))

        # ── Total Count (antes da paginação) ──────────────────────────────────
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.session.execute(count_query)
        total = total_result.scalar() or 0

        # ── Ordenação ─────────────────────────────────────────────────────────
        sort_attr = None
        if sort_by == "contract_number":
            sort_attr = Contrato.contract_number
        elif sort_by == "risk_score":
            sort_attr = cast(Contrato.analysis["risk_score"].astext, String) # Simplificado
        elif sort_by == "valor_global":
            sort_attr = Contrato.raw_contract["valor_global"].astext
        elif sort_by == "fornecedor":
            sort_attr = Contrato.raw_contract["fornecedor"]["nome"].astext
        else:  # default: vigencia_fim
            sort_attr = Contrato.raw_contract["vigencia_fim"].astext

        if order == "desc":
            query = query.order_by(desc(sort_attr))
        else:
            query = query.order_by(asc(sort_attr))

        # ── Paginação ─────────────────────────────────────────────────────────
        query = query.offset((page - 1) * limit).limit(limit)

        result = await self.session.execute(query)
        items = list(result.scalars().all())

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
