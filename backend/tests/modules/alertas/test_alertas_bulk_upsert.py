import pytest
import uuid
from sqlalchemy.future import select
from backend.modules.alertas.models.models import Alerta
from backend.modules.alertas.models.enums import AlertStatusEnum
from backend.modules.alertas.repositories.alertas_repository import AlertasRepository

pytestmark = pytest.mark.asyncio

async def test_bulk_upsert_homogeneous(db_session):
    """Testa o upsert com um payload perfeitamente formado e homogêneo."""
    repo = AlertasRepository(db_session)
    contract_id = str(uuid.uuid4())
    
    candidates = [
        {
            "contract_id": contract_id,
            "type": "test_alert",
            "category": "info",
            "severity": "high",
            "priority": "high",
            "title": "Alerta Homogêneo",
            "message": "Mensagem Teste",
            "metadata_json": {"foo": "bar"}
        }
    ]
    
    await repo.bulk_upsert_alerts(candidates)
    
    # Valida inserção
    result = await db_session.execute(select(Alerta).where(Alerta.contract_id == contract_id))
    alertas = result.scalars().all()
    assert len(alertas) == 1
    assert alertas[0].metadata_json == {"foo": "bar"}
    assert alertas[0].severity == "high"


async def test_bulk_upsert_missing_metadata(db_session):
    """Testa candidato omitindo a chave metadata_json."""
    repo = AlertasRepository(db_session)
    contract_id = str(uuid.uuid4())
    
    candidates = [
        {
            "contract_id": contract_id,
            "type": "test_alert_missing_meta",
            "category": "info",
            "severity": "low",
            "priority": "low",
            "title": "Sem Metadata",
            "message": "Mensagem Teste"
            # Omitiu metadata_json intencionalmente
        }
    ]
    
    await repo.bulk_upsert_alerts(candidates)
    
    result = await db_session.execute(select(Alerta).where(Alerta.contract_id == contract_id))
    alertas = result.scalars().all()
    assert len(alertas) == 1
    assert alertas[0].metadata_json == {} # Default esperado
    

async def test_bulk_upsert_none_metadata(db_session):
    """Testa candidato com metadata_json = None."""
    repo = AlertasRepository(db_session)
    contract_id = str(uuid.uuid4())
    
    candidates = [
        {
            "contract_id": contract_id,
            "type": "test_alert_none_meta",
            "category": "info",
            "severity": "low",
            "priority": "low",
            "title": "None Metadata",
            "message": "Mensagem Teste",
            "metadata_json": None # Nulo explícito
        }
    ]
    
    await repo.bulk_upsert_alerts(candidates)
    
    result = await db_session.execute(select(Alerta).where(Alerta.contract_id == contract_id))
    alertas = result.scalars().all()
    assert len(alertas) == 1
    assert alertas[0].metadata_json == {} # Default esperado


async def test_bulk_upsert_conflict_update(db_session):
    """Testa a operação on_conflict_do_update modificando campos e reativando alerta."""
    repo = AlertasRepository(db_session)
    contract_id = str(uuid.uuid4())
    
    cand1 = {
        "contract_id": contract_id,
        "type": "test_conflict",
        "category": "info",
        "severity": "low",
        "priority": "low",
        "title": "Alerta Original",
        "message": "Original",
        "metadata_json": {"step": 1}
    }
    
    await repo.bulk_upsert_alerts([cand1])
    
    # Buscar e mockar como resolvido
    result = await db_session.execute(select(Alerta).where(Alerta.contract_id == contract_id))
    alerta = result.scalars().first()
    alerta.status = AlertStatusEnum.RESOLVED
    await db_session.commit()
    
    # Upsert do mesmo alerta mas com dados atualizados
    cand2 = {
        "contract_id": contract_id,
        "type": "test_conflict",
        "category": "info",
        "severity": "critical", # Mudou severity
        "priority": "high", # Mudou priority
        "title": "Alerta Atualizado",
        "message": "Atualizado",
        "metadata_json": {"step": 2}
    }
    
    await repo.bulk_upsert_alerts([cand2])
    
    # Validar update
    result2 = await db_session.execute(select(Alerta).where(Alerta.contract_id == contract_id))
    alerta_atualizado = result2.scalars().first()
    
    assert alerta_atualizado.status == AlertStatusEnum.ACTIVE
    assert alerta_atualizado.severity == "critical"
    assert alerta_atualizado.title == "Alerta Atualizado"
    assert alerta_atualizado.metadata_json == {"step": 2}


async def test_bulk_upsert_heterogeneous_batch(db_session):
    """Testa batch contendo candidatos de todos os tipos ao mesmo tempo para prevenir erro de colunas do sqlalchemy."""
    repo = AlertasRepository(db_session)
    contract_id = str(uuid.uuid4())
    
    candidates = [
        {
            "contract_id": contract_id,
            "type": "type_1",
            "severity": "low",
            "metadata_json": {"id": 1}
        },
        {
            "contract_id": contract_id,
            "type": "type_2",
            "severity": "medium",
            # missing metadata_json and priority
        },
        {
            "contract_id": contract_id,
            "type": "type_3",
            "severity": "high",
            "metadata_json": None,
            "title": "Title custom"
        }
    ]
    
    await repo.bulk_upsert_alerts(candidates)
    
    result = await db_session.execute(select(Alerta).where(Alerta.contract_id == contract_id))
    alertas = result.scalars().all()
    
    assert len(alertas) == 3
    # Garantir que nenhum sumiu e que a normalização segurou o payload.
    for a in alertas:
        assert isinstance(a.metadata_json, dict)
        if a.type == "type_3":
            assert a.title == "Title custom"
