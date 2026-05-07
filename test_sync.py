import asyncio
from backend.modules.sincronizacao.jobs.jobs import job_sincronizacao
from backend.modules.sincronizacao.services.services import SincronizacaoService
from backend.core.database.database import AsyncSessionLocal
from backend.core.logging.logger import setup_logging

async def run_sync():
    setup_logging()
    # Testar o Orquestrador
    await job_sincronizacao()
    
    # Testar On-Demand
    async with AsyncSessionLocal() as session:
        service = SincronizacaoService(session)
        # Passar um ID que não exista ou exista para testar
        try:
            res = await service.sync_endpoint_on_demand("INVALID", "empenhos")
            print(res)
        except Exception as e:
            print("Esperado falhar por ID inválido:", e)

if __name__ == "__main__":
    import sys
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run_sync())
