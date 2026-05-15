"""
vigencia_utils.py
─────────────────
Helper centralizado para parsing da data de vigência final dos contratos.

Regras:
  - Lê `raw_contract.get("vigencia_fim")`
  - Suporta formato BR (dd/mm/yyyy) e ISO (yyyy-mm-dd)
  - Retorna `None` em qualquer falha, sem propagar exceção
  - Nunca quebra importação ou fluxo do sistema

Uso:
    from backend.modules.contratos.domain.vigencia_utils import parse_vigencia_fim

    vigencia_fim = parse_vigencia_fim(raw_contract)
"""
from __future__ import annotations

import logging
from datetime import date, datetime
from typing import Any, Optional

logger = logging.getLogger(__name__)

# Formatos aceitos em ordem de preferência
_DATE_FORMATS = [
    "%d/%m/%Y",   # Formato padrão da API Comprasnet (ex: "31/12/2026")
    "%Y-%m-%d",   # Formato ISO (ex: "2026-12-31")
    "%d-%m-%Y",   # Variante com traço
    "%Y/%m/%d",   # Variante ISO com barra
]


def parse_vigencia_fim(raw_contract: Optional[dict[str, Any]]) -> Optional[date]:
    """
    Extrai e converte a data de vigência final do JSONB raw_contract.

    Args:
        raw_contract: Dicionário com os dados brutos do contrato (pode ser None).

    Returns:
        `datetime.date` se a data for válida, `None` caso contrário.
    """
    if not raw_contract or not isinstance(raw_contract, dict):
        return None

    raw_value = raw_contract.get("vigencia_fim")
    if not raw_value:
        return None

    return _parse_date_str(str(raw_value).strip())


def _parse_date_str(value: str) -> Optional[date]:
    """
    Tenta converter uma string de data em `datetime.date`.

    Testa múltiplos formatos; retorna None se nenhum funcionar.
    Usa apenas os primeiros 10 caracteres para tolerar datas com hora.
    """
    candidate = value[:10]  # Ignora porção de hora se houver

    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(candidate, fmt).date()
        except ValueError:
            continue

    # Nenhum formato funcionou
    logger.warning(
        "parse_vigencia_fim: não foi possível converter data de vigência",
        extra={"raw_value": value},
    )
    return None
