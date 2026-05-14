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
# pyrefly: ignore [missing-import]
# pyrefly: ignore [missing-import]  
# pyrefly: ignore [missing-import]
from sqlalchemy.dialects.postgresql import insert as pg_insert
# pyrefly: ignore [missing-import]
from sqlalchemy import insert
from backend.modules.auditoria.models.models import AlertHistory

class AlertasRepository:
    EXPECTED_KEYS = {
        "contract_id": "",
        "type": "",
        "category": "info",
        "severity": "low",
        "priority": "low",
        "title": "Alerta",
        "message": "",
        "recommended_action": None,
        "source": "analysis_engine",
        "analyzer_name": None,
        "metadata_json": {},
    }

    UPDATE_MAPPING = {
        "severity": "severity",
        "priority": "priority",
        "title": "title",
        "message": "message",
        "recommended_action": "recommended_action",
        "metadata_json": "metadata",
    }

    def __init__(self, session: AsyncSession):
        self.session = session
        self.history_repo = HistoryRepository(session)

    def _normalize_candidate(self, candidate: Dict[str, Any]) -> Dict[str, Any]:
        normalized = {}
        for key, default_value in self.EXPECTED_KEYS.items():
            val = candidate.get(key)
            if val is None and key == "metadata_json":
                val = {}
            elif val is None and default_value is not None:
                val = default_value
            normalized[key] = val
        return normalized

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

        normalized_candidates = []
        for c in candidates:
            try:
                normalized_candidates.append(self._normalize_candidate(c))
            except Exception as e:
                log.error("Candidato de alerta ignorado por falha na normalização", candidate=c, error=str(e))

        if not normalized_candidates:
            return

        # Gerar fingerprints
        for candidate in normalized_candidates:
            candidate["fingerprint"] = self.generate_fingerprint(
                candidate["contract_id"], candidate["type"], candidate.get("metadata_json", {})
            )
            
        fingerprints = [c["fingerprint"] for c in normalized_candidates]
        
        # Buscar os existentes para saber o que é update/reativação
        stmt = select(Alerta.fingerprint, Alerta.id, Alerta.status).where(Alerta.fingerprint.in_(fingerprints))
        result = await self.session.execute(stmt)
        existing_map = {row.fingerprint: {"id": row.id, "status": row.status} for row in result.all()}
        
        values_to_upsert = []
        history_batch = []
        
        for candidate in normalized_candidates:
            fp = candidate["fingerprint"]
            existing = existing_map.get(fp)
            
            # Valores para o UPSERT
            alert_id = existing["id"] if existing else str(uuid.uuid4())
            
            val = {
                "id": alert_id,
                "contract_id": candidate["contract_id"],
                "type": candidate["type"],
                "category": candidate["category"],
                "severity": candidate["severity"],
                "priority": candidate["priority"],
                "title": candidate["title"],
                "message": candidate["message"],
                "recommended_action": candidate.get("recommended_action"),
                "source": candidate.get("source", "analysis_engine"),
                "analyzer_name": candidate.get("analyzer_name"),
                "fingerprint": fp,
                "status": AlertStatusEnum.ACTIVE,
                "first_seen_at": now,
                "last_seen_at": now,
                "metadata_json": candidate.get("metadata_json", {})
            }
            values_to_upsert.append(val)
            
            # Histórico
            if existing:
                updated_count += 1
                if existing["status"] == AlertStatusEnum.RESOLVED:
                    history_batch.append({
                        "id": str(uuid.uuid4()),
                        "alert_id": alert_id,
                        "action": "reactivated",
                        "performed_by": "system",
                        "details": {"reason": "reappeared_in_analysis"},
                        "created_at": now
                    })
            else:
                created_count += 1
                history_batch.append({
                    "id": str(uuid.uuid4()),
                    "alert_id": alert_id,
                    "action": "created",
                    "performed_by": "system",
                    "details": {"fingerprint": fp},
                    "created_at": now
                })
        
        if values_to_upsert:
            insert_stmt = pg_insert(Alerta).values(values_to_upsert)
            
            # On conflict: update last_seen_at e status para ACTIVE
            update_dict = {
                "last_seen_at": now,
                "status": AlertStatusEnum.ACTIVE
            }
            # Atualizar os campos que podem mudar ou os essenciais (mapeamento ORM -> Físico)
            for orm_attr, physical_col in self.UPDATE_MAPPING.items():
                update_dict[physical_col] = getattr(insert_stmt.excluded, physical_col)
                
            upsert_stmt = insert_stmt.on_conflict_do_update(
                index_elements=['fingerprint'],
                set_=update_dict
            )
            
            await self.session.execute(upsert_stmt)
            
        if history_batch:
            # Bulk insert no histórico
            await self.session.execute(insert(AlertHistory).values(history_batch))
            
        log.info("Operação de upsert de alertas concluída (Bulk PostgreSQL)", created=created_count, updated=updated_count)

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
        
        if resolved_ids:
            history_batch = [
                {
                    "id": str(uuid.uuid4()),
                    "alert_id": rid,
                    "action": "resolved",
                    "performed_by": "system",
                    "details": {"reason": "fixed_in_analysis", "analyzer": analyzer_name},
                    "created_at": now
                }
                for rid in resolved_ids
            ]
            await self.session.execute(insert(AlertHistory).values(history_batch))
            log.info("Alertas resolvidos automaticamente (Bulk History)", count=len(resolved_ids), analyzer=analyzer_name)

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

    async def list_active_by_contract(self, contract_id: str):
        stmt = (
            select(Alerta)
            .where(
                Alerta.contract_id == contract_id,
                Alerta.status.in_(
                    [
                        AlertStatusEnum.ACTIVE,
                        AlertStatusEnum.VIEWED,
                    ]
                )
            )
            .order_by(
                Alerta.created_at.desc()
            )
        )

        result = await self.session.execute(stmt)

        return result.scalars().all()
