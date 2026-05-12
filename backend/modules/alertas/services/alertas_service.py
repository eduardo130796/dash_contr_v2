from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from backend.modules.alertas.repositories.alertas_repository import AlertasRepository
from backend.modules.alertas.models.enums import AlertStatusEnum
from backend.modules.auditoria.repositories.history_repository import HistoryRepository
from backend.core.logging.logger import log

class AlertasService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repository = AlertasRepository(session)
        self.history_repo = HistoryRepository(session)

    async def list_alerts(self, filters: dict, page: int, limit: int):
        return await self.repository.get_alerts_with_filters(filters, page, limit)

    async def get_stats(self):
        return await self.repository.get_alert_stats()

    async def mark_as_viewed(self, alert_id: str, performed_by: str = "user"):
        alert = await self.session.get(Alerta, alert_id) if False else None # Placeholder
        # Na verdade vamos usar o repository ou session direta
        from backend.modules.alertas.models.models import Alerta
        alert = await self.session.get(Alerta, alert_id)
        
        if not alert:
            return None

        if alert.status == AlertStatusEnum.ACTIVE:
            alert.status = AlertStatusEnum.VIEWED
            await self.history_repo.log_alert_action(alert_id, "viewed", performed_by)
            await self.session.commit()
            log.debug("Alerta marcado como visto", alert_id=alert_id)
        
        return alert

    async def dismiss_alert(self, alert_id: str, reason: str, performed_by: str = "user"):
        from backend.modules.alertas.models.models import Alerta
        alert = await self.session.get(Alerta, alert_id)
        
        if not alert:
            return None

        alert.status = AlertStatusEnum.DISMISSED
        alert.dismissed_at = datetime.now(timezone.utc)
        
        await self.history_repo.log_alert_action(
            alert_id, 
            "dismissed", 
            performed_by, 
            details={"reason": reason}
        )
        await self.session.commit()
        log.info("Alerta dispensado pelo usuário", alert_id=alert_id, reason=reason)
        
        return alert
