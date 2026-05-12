import asyncio
import sys
import os

# Adicionar o diretório raiz ao path
sys.path.append(os.getcwd())

from backend.core.database.database import AsyncSessionLocal
from backend.modules.analise.services.analysis_service import AnalysisService
from backend.core.logging.logger import setup_logging

async def main():
    setup_logging()
    async with AsyncSessionLocal() as session:
        service = AnalysisService(session)
        print("Iniciando Analysis Engine manual...")
        await service.run_full_analysis()
        print("Finalizado.")

if __name__ == "__main__":
    asyncio.run(main())
