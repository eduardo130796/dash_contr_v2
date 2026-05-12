"""
Regras oficiais de elegibilidade para KPIs e listagens operacionais.

Toda interpretação de \"ativo\", vigência e tipo de instrumento para comparação
entre Painel Executivo e Operações Contratuais deve usar estas funções.
"""

from __future__ import annotations

from datetime import date
from typing import Any, Mapping

# Situações que encerram o instrumento para fins de portfólio executivo/operacional.
TERMINAL_STATUSES: frozenset[str] = frozenset({"encerrado", "vencido", "cancelado"})

# Valor oficial na coluna `Contrato.status` / fluxo do sincronizador para vigência sem data fim.
VIGENCIA_INDEFINIDA_STATUS: str = "vigencia_indefinida"


def parse_vigencia_fim(raw_contract: Mapping[str, Any] | None) -> date | None:
    """
    Converte apenas `raw_contract['vigencia_fim']` do payload original em `date` ou `None`.
    Não infere datas por outros campos.
    """
    if not raw_contract:
        return None
    value = raw_contract.get("vigencia_fim")
    if value is None or (isinstance(value, str) and not value.strip()):
        return None
    try:
        return date.fromisoformat(str(value)[:10])
    except (ValueError, TypeError):
        return None


def normalized_status_column(status: str | None) -> str:
    return (status or "").strip().lower()


def is_vigencia_indefinida_status(status: str | None) -> bool:
    """Situação operacional explícita: vigente sem término definido na fonte."""
    return normalized_status_column(status) == VIGENCIA_INDEFINIDA_STATUS


def normalized_tipo_instrumento(raw_contract: Mapping[str, Any] | None) -> str:
    """
    Tipo oficial do instrumento: somente `raw_contract['tipo']` do payload espelhado (JSONB).
    Normalização: trim + minúsculas para comparação (ex.: `\"Contrato\"` → `contrato`).
    Sem inferência por categoria, subtipo ou heurística.
    """
    if not raw_contract:
        return ""
    raw_value = raw_contract.get("tipo")
    if raw_value is None:
        return ""
    return str(raw_value).strip().lower()


def normalized_tipo_matches_instrument_kind(
    normalized_tipo: str,
    instrument_kind: str,
) -> bool:
    """
    Classifica o tipo **já normalizado** (`normalized_tipo_instrumento`) no filtro operacional.

    Evita comparação literal com o JSON bruto: valores reais incluem `Contrato`,
    `CONTRATO`, `Contrato Administrativo`, etc. — todos passam por `normalized_tipo_instrumento`
    e depois por esta função, em KPIs e (via SQL espelhado) na listagem.

    Regras:
    - **contrato:** igual a `contrato` ou prefixo `contrato ` (espaço obrigatório após a palavra-base).
    - **empenho:** `empenho` / `empenhos` exatos ou prefixos `empenho ` / `empenhos `.
    - **ata:** `ata` / `atas` exatos ou prefixos `ata ` / `atas `.
    - **all:** qualquer linha (o chamador não deve filtrar por tipo).
    """
    ik = (instrument_kind or "contrato").strip().lower()
    if ik == "all":
        return True
    t = (normalized_tipo or "").strip().lower()
    if not t:
        return False
    if ik in ("contrato", "contratos"):
        return t == "contrato" or t.startswith("contrato ")
    if ik in ("empenho", "empenhos"):
        return (
            t in ("empenho", "empenhos")
            or t.startswith("empenho ")
            or t.startswith("empenhos ")
        )
    if ik in ("ata", "atas"):
        return t in ("ata", "atas") or t.startswith("ata ") or t.startswith("atas ")
    return False


def counts_in_expiration_views(
    status: str | None,
    vigencia_fim: date | None,
    today: date,
) -> bool:
    """
    Define se o instrumento entra em KPIs / timeline / gráficos de **vencimento**.

    Contratos em `vigencia_indefinida` permanecem no portfólio ativo, mas **não**
    participam de métricas de expiração, mesmo com `vigencia_fim` ausente ou residual no JSON.
    """
    if is_vigencia_indefinida_status(status):
        return False
    return vigencia_fim is not None and vigencia_fim >= today


def is_portfolio_row_active(is_active: bool | None, status: str | None) -> bool:
    """
    Instrumento ainda no portfólio analítico (não encerrado / não vencido na coluna).

    `status == vigencia_indefinida` conta como **ativo operacional** (vigência indeterminada).
    """
    if is_active:
        return True
    if is_vigencia_indefinida_status(status):
        return True
    st = normalized_status_column(status)
    if not st:
        return True
    return st not in TERMINAL_STATUSES


def is_contrato_executivo_kpi_row(
    is_active: bool | None,
    status: str | None,
    raw_contract: Mapping[str, Any] | None,
) -> bool:
    """
    **Contrato ativo executivo (KPI Painel Executivo)**

    Critérios:
    - `raw_contract.tipo` via `normalized_tipo_instrumento` + `normalized_tipo_matches_instrument_kind(..., "contrato")`.
    - Portfólio ativo: `is_portfolio_row_active` (vide doc em `docs/REGRAS_NEGOCIO.md`).

    Métricas de **vencimento** (buckets 30/60/90/180, timeline, gráfico mensal) usam
    `counts_in_expiration_views`: excluem `vigencia_indefinida` e exigem `vigencia_fim`
    efetiva no `raw_contract`.
    """
    if not normalized_tipo_matches_instrument_kind(
        normalized_tipo_instrumento(raw_contract), "contrato"
    ):
        return False
    return is_portfolio_row_active(is_active, status)


def is_empenho_kpi_row(
    is_active: bool | None,
    status: str | None,
    raw_contract: Mapping[str, Any] | None,
) -> bool:
    if not normalized_tipo_matches_instrument_kind(
        normalized_tipo_instrumento(raw_contract), "empenho"
    ):
        return False
    return is_portfolio_row_active(is_active, status)


def is_ata_kpi_row(
    is_active: bool | None,
    status: str | None,
    raw_contract: Mapping[str, Any] | None,
) -> bool:
    if not normalized_tipo_matches_instrument_kind(
        normalized_tipo_instrumento(raw_contract), "ata"
    ):
        return False
    return is_portfolio_row_active(is_active, status)
