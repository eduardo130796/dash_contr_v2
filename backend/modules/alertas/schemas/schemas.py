from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class AlertaResponse(BaseModel):
    id: str
    contract_id: str
    type: str
    category: str
    severity: str
    priority: str
    title: str
    message: str
    recommended_action: Optional[str]
    contract_number: Optional[str] = None
    status: str
    source: str
    created_at: datetime
    last_seen_at: datetime
    metadata_json: Optional[Dict[str, Any]]

    class Config:
        from_attributes = True

class AlertaStats(BaseModel):
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    info: int = 0
    resolved_today: int = 0

class DismissRequest(BaseModel):
    reason: str
