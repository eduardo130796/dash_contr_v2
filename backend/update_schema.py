import asyncio
from sqlalchemy import text
from backend.core.database.database import AsyncSessionLocal
from backend.core.logging.logger import setup_logging, log

async def update_schema():
    setup_logging()
    log.info("Atualizando esquema do banco de dados...")
    async with AsyncSessionLocal() as session:
        # Colunas para Contratos
        await session.execute(text("ALTER TABLE contratos ADD COLUMN IF NOT EXISTS last_analysis_at TIMESTAMP WITH TIME ZONE;"))
        await session.execute(text("ALTER TABLE contratos ADD COLUMN IF NOT EXISTS analysis_version VARCHAR DEFAULT '1.0.0';"))
        
        # Colunas para Alertas
        await session.execute(text("ALTER TABLE alertas ADD COLUMN IF NOT EXISTS category VARCHAR;"))
        await session.execute(text("ALTER TABLE alertas ADD COLUMN IF NOT EXISTS priority VARCHAR;"))
        await session.execute(text("ALTER TABLE alertas ADD COLUMN IF NOT EXISTS source VARCHAR;"))
        await session.execute(text("ALTER TABLE alertas ADD COLUMN IF NOT EXISTS analyzer_name VARCHAR;"))
        await session.execute(text("ALTER TABLE alertas ADD COLUMN IF NOT EXISTS fingerprint VARCHAR UNIQUE;"))
        await session.execute(text("ALTER TABLE alertas ADD COLUMN IF NOT EXISTS recommended_action VARCHAR;"))
        await session.execute(text("ALTER TABLE alertas ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();"))
        await session.execute(text("ALTER TABLE alertas ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();"))
        
        # Garantir que fingerprint tenha índice único se não existir
        await session.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS idx_alerta_fingerprint ON alertas (fingerprint);"))

        await session.commit()
    log.info("Esquema atualizado com sucesso.")

if __name__ == "__main__":
    asyncio.run(update_schema())
