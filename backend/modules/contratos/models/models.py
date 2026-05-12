from sqlalchemy import Column, String, Boolean, DateTime, func
from sqlalchemy.dialects.postgresql import JSONB
from backend.core.database.database import Base

class Contrato(Base):
    __tablename__ = "contratos"

    id = Column(String, primary_key=True)  # UUID
    external_id = Column(String, unique=True, index=True)
    contract_number = Column(String, index=True)
    is_active = Column(Boolean, default=True)
    status = Column(String)

    # Hashes por domínio (sincronização granular)
    main_hash = Column(String)
    empenhos_hash = Column(String)
    faturas_hash = Column(String)
    historico_hash = Column(String)
    garantias_hash = Column(String)
    responsaveis_hash = Column(String)
    itens_hash = Column(String)

    # Payloads JSONB
    raw_contract = Column(JSONB)
    raw_empenhos = Column(JSONB)
    raw_faturas = Column(JSONB)
    raw_garantias = Column(JSONB)
    raw_historico = Column(JSONB)
    raw_responsaveis = Column(JSONB)
    raw_itens = Column(JSONB)
    analysis = Column(JSONB)

    # Status dos Endpoints Secundários (success, failed, pending, stale)
    empenhos_status = Column(String, default="pending")
    faturas_status = Column(String, default="pending")
    historico_status = Column(String, default="pending")
    garantias_status = Column(String, default="pending")
    responsaveis_status = Column(String, default="pending")
    itens_status = Column(String, default="pending")

    # Timestamps e Metadados Analíticos
    last_analysis_at = Column(DateTime(timezone=True))
    analysis_version = Column(String, default="1.0.0")

    # Timestamps de Sincronização
    last_sync_at = Column(DateTime(timezone=True))
    last_main_update_at = Column(DateTime(timezone=True))
    last_operational_update_at = Column(DateTime(timezone=True))
    last_success_sync_at = Column(DateTime(timezone=True))
    last_failed_sync_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
