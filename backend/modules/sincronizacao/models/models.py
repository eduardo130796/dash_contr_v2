from sqlalchemy import Column, String, DateTime, Integer, func
from sqlalchemy.dialects.postgresql import JSONB
from backend.core.database.database import Base

class SyncExecution(Base):
    __tablename__ = "sync_executions"

    id = Column(String, primary_key=True)  # UUID
    type = Column(String, index=True)  # 'bootstrap' ou 'incremental'
    status = Column(String, index=True)  # 'running', 'completed', 'failed', 'paused'
    
    last_page_processed = Column(Integer, default=0)
    processed_contracts = Column(Integer, default=0)
    failed_contracts = Column(Integer, default=0)
    retry_count = Column(Integer, default=0)
    
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    error_log = Column(JSONB, nullable=True)
