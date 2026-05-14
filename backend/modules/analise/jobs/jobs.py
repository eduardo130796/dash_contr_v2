from apscheduler.schedulers.asyncio import AsyncIOScheduler
from backend.core.database.database import AsyncSessionLocal
from backend.core.logging.logger import log
from backend.modules.analise.services.analysis_service import AnalysisService

scheduler = AsyncIOScheduler()

async def job_analysis_engine():
    log.info("Execução agendada da Analysis Engine iniciada")
    try:
        async with AsyncSessionLocal() as session:
            service = AnalysisService(session)
            await service.run_full_analysis()
    except Exception as e:
        log.error("Falha no job da Analysis Engine", error=str(e), exc_info=True)

#def setup_analysis_jobs():
    # Roda a cada 5 minutos (desfasado da sincronização para evitar picos)
#    scheduler.add_job(job_analysis_engine, 'cron', minute='1,6,11,16,21,26,31,36,41,46,51,56', id='analysis_engine_job')
#    scheduler.start()
#    log.info("APScheduler da Analysis Engine iniciado (Intervalo: 5m)")
def setup_analysis_jobs():

    # Desenvolvimento / calibração
    scheduler.add_job(
        job_analysis_engine,
        'interval',
        seconds=30,
        id='analysis_engine_job'
    )

    scheduler.start()

    log.info(
        "APScheduler da Analysis Engine iniciado (Intervalo: 30s)"
    )