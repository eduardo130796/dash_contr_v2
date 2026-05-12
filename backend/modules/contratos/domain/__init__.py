"""Regras de domínio reutilizáveis para contratos e instrumentos (SSOT em Python)."""

from backend.modules.contratos.domain.ativo_rules import (  # noqa: F401
    TERMINAL_STATUSES,
    VIGENCIA_INDEFINIDA_STATUS,
    counts_in_expiration_views,
    is_portfolio_row_active,
    is_contrato_executivo_kpi_row,
    is_vigencia_indefinida_status,
    normalized_tipo_instrumento,
    normalized_tipo_matches_instrument_kind,
    parse_vigencia_fim,
)
