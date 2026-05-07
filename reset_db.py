import asyncio
from sqlalchemy import text
from backend.core.database.database import AsyncSessionLocal
from backend.core.logging.logger import setup_logging, log

async def reset_db():
    setup_logging()
    log.info("Resetando banco de dados...")
    async with AsyncSessionLocal() as session:
        await session.execute(text("TRUNCATE TABLE alert_history, notifications, alertas, contratos CASCADE;"))
        await session.commit()
    log.info("Banco de dados resetado com sucesso.")

if __name__ == "__main__":
    import sys
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(reset_db())
