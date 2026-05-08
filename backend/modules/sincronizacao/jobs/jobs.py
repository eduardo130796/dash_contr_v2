from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.future import select
from datetime import datetime, timezone
from sqlalchemy import func
from backend.core.database.database import AsyncSessionLocal
from backend.core.logging.logger import log
from backend.modules.sincronizacao.services.services import SincronizacaoService
from backend.modules.sincronizacao.models.models import SyncExecution

scheduler = AsyncIOScheduler()

async def job_sincronizacao():
    log.info("Iniciando orquestração de sincronização (Bootstrap/Incremental)")
    try:
        async with AsyncSessionLocal() as session:
            # 1. Checa se o bootstrap já foi feito na vida
            result_boot = await session.execute(
                select(SyncExecution).filter_by(type='bootstrap', status='completed')
            )
            bootstrap_completed = result_boot.scalars().first() is not None
            
            service = SincronizacaoService(session)
            
            if not bootstrap_completed:
                log.info("Modo BOOTSTRAP pendente. Acionando/Retomando cobertura total.")
                await service.sync_bootstrap()
                return

            # 2. Se já fez bootstrap, avalia Incremental de HOJE
            hoje = datetime.now(timezone.utc).date()
            
            # Buscar a última execução incremental de hoje
            result_inc = await session.execute(
                select(SyncExecution)
                .filter(SyncExecution.type == 'incremental')
                .filter(func.date(SyncExecution.started_at) == hoje)
                .order_by(SyncExecution.started_at.desc())
            )
            ultima_execucao_hoje = result_inc.scalars().first()
            
            if ultima_execucao_hoje and ultima_execucao_hoje.status == 'completed':
                log.info("Sincronização INCREMENTAL de hoje já concluída com sucesso. Ignorando execução para poupar a API.", data=str(hoje))
                return
                
            log.info("Modo INCREMENTAL acionado (Ainda não foi completado hoje ou houve falha/pending)")
            await service.sync_incremental()
                
    except Exception as e:
        log.error("Falha crítica no job de orquestração", exc_info=True)

def setup_jobs():
    # Roda a cada 2 horas
    #scheduler.add_job(job_sincronizacao, 'cron', hour='0,2,4,6,8,10,12,14,16,18,20,22', minute=0, id='sync_orchestrator')
    scheduler.add_job(job_sincronizacao, 'cron', minute='*/2', id='sync_orchestrator')
    scheduler.start()
    log.info("APScheduler iniciado e jobs configurados a cada 2h (Coordenador Inteligente)")
