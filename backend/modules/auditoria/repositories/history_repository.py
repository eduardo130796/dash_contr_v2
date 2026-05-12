import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from backend.modules.auditoria.models.models import AlertHistory
from backend.core.logging.logger import log

class HistoryRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def log_alert_action(
        self, 
        alert_id: str, 
        action: str, 
        performed_by: str = "system", 
        details: dict = None
    ):
        try:
            history = AlertHistory(
                id=str(uuid.uuid4()),
                alert_id=alert_id,
                action=action,
                performed_by=performed_by,
                details=details or {}
            )
            self.session.add(history)
            await self.session.flush()
            log.debug("Ação de alerta registrada no histórico", alert_id=alert_id, action=action)
        except Exception as e:
            log.error("Falha ao registrar histórico de alerta", alert_id=alert_id, error=str(e))
