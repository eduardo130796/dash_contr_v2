import uuid
import json
import hashlib
from datetime import datetime, timezone
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update, and_
from backend.modules.alertas.models.models import Alerta
from backend.modules.alertas.models.enums import AlertStatusEnum
from backend.modules.auditoria.repositories.history_repository import HistoryRepository
from backend.core.logging.logger import log

class AlertasRepository:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.history_repo = HistoryRepository(session)

    def generate_fingerprint(self, contract_id: str, alert_type: str, context: Dict[str, Any]) -> str:
        payload = {
            "contract_id": contract_id,
            "type": alert_type,
            "context": context
        }
        encoded = json.dumps(payload, sort_keys=True).encode()
        return hashlib.sha256(encoded).hexdigest()

    async def bulk_upsert_alerts(self, candidates: List[Dict[str, Any]]):
        """
        Realiza o upsert de múltiplos alertas garantindo a idempotência via fingerprint.
        """
        if not candidates:
            return

        now = datetime.now(timezone.utc)
        created_count = 0
        updated_count = 0

        for candidate in candidates:
            contract_id = candidate["contract_id"]
            alert_type = candidate["type"]
            context = candidate.get("metadata", {})
            
            fingerprint = self.generate_fingerprint(contract_id, alert_type, context)
            
            # Verificar se já existe um alerta com esse fingerprint
            stmt = select(Alerta).filter(Alerta.fingerprint == fingerprint)
            result = await self.session.execute(stmt)
            existing_alert = result.scalars().first()

            if existing_alert:
                # Se existe e está resolvido, podemos reativar ou apenas atualizar last_seen
                # O requisito diz: "Alertas resolvidos NÃO devem perder histórico"
                # Se já existe, atualizamos o last_seen_at
                existing_alert.last_seen_at = now
                
                # Se estava resolvido mas a causa voltou, reativamos
                if existing_alert.status == AlertStatusEnum.RESOLVED:
                    existing_alert.status = AlertStatusEnum.ACTIVE
                    await self.history_repo.log_alert_action(
                        existing_alert.id, 
                        "reactivated", 
                        details={"reason": "reappeared_in_analysis"}
                    )
                
                updated_count += 1
            else:
                # Criar novo alerta
                new_alert = Alerta(
                    id=str(uuid.uuid4()),
                    contract_id=contract_id,
                    type=alert_type,
                    category=candidate["category"],
                    severity=candidate["severity"],
                    priority=candidate["priority"],
                    title=candidate["title"],
                    message=candidate["message"],
                    recommended_action=candidate.get("recommended_action"),
                    source=candidate.get("source", "analysis_engine"),
                    analyzer_name=candidate.get("analyzer_name"),
                    fingerprint=fingerprint,
                    status=AlertStatusEnum.ACTIVE,
                    first_seen_at=now,
                    last_seen_at=now,
                    metadata_json=context
                )
                self.session.add(new_alert)
                await self.session.flush() # Para garantir que o ID esteja disponível
                
                await self.history_repo.log_alert_action(
                    new_alert.id, 
                    "created", 
                    details={"fingerprint": fingerprint}
                )
                created_count += 1

        log.info("Operação de upsert de alertas concluída", created=created_count, updated=updated_count)

    async def bulk_resolve_alerts(self, contract_ids: List[str], active_fingerprints: List[str], analyzer_name: str):
        """
        Resolve alertas ativos de um contrato que não foram reportados nesta rodada de análise.
        """
        now = datetime.now(timezone.utc)
        
        # Selecionar alertas ativos do analyzer X para os contratos Y que NÃO estão na lista de ativos
        stmt = (
            update(Alerta)
            .where(
                and_(
                    Alerta.contract_id.in_(contract_ids),
                    Alerta.analyzer_name == analyzer_name,
                    Alerta.status == AlertStatusEnum.ACTIVE,
                    ~Alerta.fingerprint.in_(active_fingerprints)
                )
            )
            .values(status=AlertStatusEnum.RESOLVED, resolved_at=now)
            .returning(Alerta.id)
        )
        
        result = await self.session.execute(stmt)
        resolved_ids = result.scalars().all()
        
        for rid in resolved_ids:
            await self.history_repo.log_alert_action(
                rid, 
                "resolved", 
                details={"reason": "fixed_in_analysis", "analyzer": analyzer_name}
            )
            
        if resolved_ids:
            log.info("Alertas resolvidos automaticamente", count=len(resolved_ids), analyzer=analyzer_name)

    async def get_alerts_with_filters(self, filters: Dict[str, Any], page: int = 1, limit: int = 20):
        from backend.modules.contratos.models.models import Contrato
        
        stmt = (
            select(Alerta, Contrato.contract_number)
            .join(Contrato, Alerta.contract_id == Contrato.id, isouter=True)
        )
        
        if filters.get("status"):
            stmt = stmt.filter(Alerta.status == filters["status"])
        if filters.get("severity"):
            stmt = stmt.filter(Alerta.severity == filters["severity"])
        if filters.get("category"):
            stmt = stmt.filter(Alerta.category == filters["category"])
        if filters.get("contract_id"):
            stmt = stmt.filter(Alerta.contract_id == filters["contract_id"])
        
        if filters.get("search"):
            search = f"%{filters['search']}%"
            stmt = stmt.filter(Alerta.title.ilike(search) | Alerta.message.ilike(search))

        stmt = stmt.order_by(Alerta.last_seen_at.desc())
        stmt = stmt.offset((page - 1) * limit).limit(limit)
        
        result = await self.session.execute(stmt)
        alerts = []
        for alert, contract_number in result.all():
            alert.contract_number = contract_number
            alerts.append(alert)
        return alerts

    async def get_alert_stats(self):
        # Query para estatísticas
        # critical, high, medium, low, resolved_today, sync_failures
        from sqlalchemy import func
        
        # Exemplo simplificado
        stmt = select(
            Alerta.severity, 
            func.count(Alerta.id)
        ).filter(Alerta.status == AlertStatusEnum.ACTIVE).group_by(Alerta.severity)
        
        res = await self.session.execute(stmt)
        stats = {row[0]: row[1] for row in res.all()}
        
        # Resolvidos hoje
        today = datetime.now(timezone.utc).date()
        stmt_resolved = select(func.count(Alerta.id)).filter(
            Alerta.status == AlertStatusEnum.RESOLVED,
            func.date(Alerta.resolved_at) == today
        )
        res_resolved = await self.session.execute(stmt_resolved)
        stats["resolved_today"] = res_resolved.scalar() or 0
        
        return stats
