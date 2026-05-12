from enum import Enum

class AlertStatusEnum(str, Enum):
    ACTIVE = "active"
    VIEWED = "viewed"
    DISMISSED = "dismissed"
    RESOLVED = "resolved"
    EXPIRED = "expired"
    FAILED = "failed"

class AlertSeverityEnum(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"

class AlertPriorityEnum(str, Enum):
    IMMEDIATE = "immediate"
    HIGH = "high"
    NORMAL = "normal"
    LOW = "low"

class AlertCategoryEnum(str, Enum):
    VIGENCIA = "vigencia"
    SINCRONIZACAO = "sincronizacao"
    COMPLIANCE = "compliance"
    CADASTRO = "cadastro"
