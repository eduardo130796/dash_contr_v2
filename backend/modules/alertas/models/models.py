from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from backend.core.database.database import Base

class Alerta(Base):
    __tablename__ = "alertas"

    id = Column(String, primary_key=True)  # UUID
    contract_id = Column(String, ForeignKey("contratos.id"), index=True)
    type = Column(String, index=True)
    severity = Column(String)
    title = Column(String)
    message = Column(String)
    status = Column(String, index=True)  # active, viewed, dismissed, resolved, expired, failed

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))
    dismissed_at = Column(DateTime(timezone=True))
    resolved_at = Column(DateTime(timezone=True))
    
    last_notification_at = Column(DateTime(timezone=True))
    notification_count = Column(Integer, default=0)
    
    metadata_json = Column("metadata", JSONB)

    contrato = relationship("Contrato")
