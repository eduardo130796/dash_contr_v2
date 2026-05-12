from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, func, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from backend.core.database.database import Base
from backend.modules.alertas.models.enums import AlertStatusEnum

class Alerta(Base):
    __tablename__ = "alertas"

    id = Column(String, primary_key=True)  # UUID
    contract_id = Column(String, ForeignKey("contratos.id"), index=True)
    
    # Classificação
    type = Column(String, index=True)
    category = Column(String, index=True)
    severity = Column(String)
    priority = Column(String)
    
    # Conteúdo
    title = Column(String)
    message = Column(String)
    recommended_action = Column(String)
    
    # Governança e Rastreabilidade
    status = Column(String, index=True, default=AlertStatusEnum.ACTIVE)
    source = Column(String, index=True)  # analysis_engine, sync_engine, manual, ai
    analyzer_name = Column(String)
    fingerprint = Column(String, unique=True, index=True)
    
    # Timestamps de Lifecycle
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    first_seen_at = Column(DateTime(timezone=True), server_default=func.now())
    last_seen_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))
    dismissed_at = Column(DateTime(timezone=True))
    resolved_at = Column(DateTime(timezone=True))
    
    # Notificações
    last_notification_at = Column(DateTime(timezone=True))
    notification_count = Column(Integer, default=0)
    
    metadata_json = Column("metadata", JSONB)

    contrato = relationship("Contrato")

    __table_args__ = (
        Index("idx_alerta_fingerprint", "fingerprint", unique=True),
    )
