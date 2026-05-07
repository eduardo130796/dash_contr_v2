from sqlalchemy import Column, String, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from backend.core.database.database import Base

class AlertHistory(Base):
    __tablename__ = "alert_history"

    id = Column(String, primary_key=True)  # UUID
    alert_id = Column(String, ForeignKey("alertas.id"), index=True)
    action = Column(String)  # created, dismissed, resolved, notified
    performed_by = Column(String)  # user_id ou system
    
    details = Column(JSONB)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    alerta = relationship("Alerta")
