from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
from backend.modules.alertas.models.enums import AlertSeverityEnum, AlertPriorityEnum, AlertCategoryEnum

class AlertCandidate(BaseModel):
    contract_id: str
    type: str
    category: AlertCategoryEnum
    severity: AlertSeverityEnum
    priority: AlertPriorityEnum
    title: str
    message: str
    recommended_action: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    # Campo para rastreabilidade interna da engine
    analyzer_name: Optional[str] = None
    source: str = "analysis_engine"

    class Config:
        use_enum_values = True
