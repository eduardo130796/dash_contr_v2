from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from backend.core.database.database import Base

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True)  # UUID
    alert_id = Column(String, ForeignKey("alertas.id"), index=True)
    channel = Column(String)  # whatsapp, email
    status = Column(String, index=True)  # pending, sent, failed
    provider = Column(String)
    
    provider_response = Column(JSONB)
    
    sent_at = Column(DateTime(timezone=True))
    failed_at = Column(DateTime(timezone=True))
    
    retry_count = Column(Integer, default=0)
    error_message = Column(String)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    alerta = relationship("Alerta")
