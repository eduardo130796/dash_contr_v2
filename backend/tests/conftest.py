import pytest
import pytest_asyncio
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from backend.core.config.config import settings
from backend.core.database.database import Base

# Precisamos do event loop
@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

# Engine apontando para o banco de teste (ou o principal, mas usaremos nested transactions para rollback seguro)
@pytest_asyncio.fixture(scope="session")
async def db_engine():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    # Certificar que as tabelas existam
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()

@pytest_asyncio.fixture()
async def db_session(db_engine):
    """
    Fixture de sessão do banco de dados que faz rollback de TODAS as alterações.
    Usa connection em vez de session vinculada ao engine global para 
    garantir que possamos rolar de volta.
    """
    connection = await db_engine.connect()
    transaction = await connection.begin()
    
    # Criamos a session conectada na nossa connection que tem uma transaction ativa
    AsyncSessionLocal = sessionmaker(
        bind=connection,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False
    )
    
    session = AsyncSessionLocal()
    
    # Inicia um savepoint se quisermos
    nested = await connection.begin_nested()
    
    yield session
    
    await session.close()
    if nested.is_active:
        await nested.rollback()
    await transaction.rollback()
    await connection.close()
