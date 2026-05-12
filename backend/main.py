from fastapi import FastAPI
from contextlib import asynccontextmanager
from backend.core.config.config import settings
from backend.core.logging.logger import setup_logging, log
from backend.core.exceptions.exceptions import global_exception_handler, business_exception_handler, BusinessException
from backend.modules.sincronizacao.jobs.jobs import setup_jobs
from backend.modules.analise.jobs.jobs import setup_analysis_jobs
from backend.modules.contratos.routes.routes import router as contratos_router
from backend.modules.sincronizacao.routes.routes import router as sincronizacao_router
from backend.modules.dashboard.routes.routes import router as dashboard_router
from backend.modules.alertas.routes.routes import router as alertas_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    setup_logging()
    log.info("Iniciando aplicação", app_name=settings.APP_NAME, env=settings.APP_ENV)
    setup_jobs()
    setup_analysis_jobs()
    
    yield
    
    # Shutdown
    log.info("Encerrando aplicação")

app = FastAPI(
    title=settings.APP_NAME,
    description="Backend estruturado para plataforma de gestão contratual.",
    version="1.0.0",
    lifespan=lifespan
)

# Exception handlers
app.add_exception_handler(Exception, global_exception_handler)
app.add_exception_handler(BusinessException, business_exception_handler)

# Rotas
app.include_router(contratos_router, prefix="/api/v1")
app.include_router(sincronizacao_router, prefix="/api/v1")
app.include_router(dashboard_router, prefix="/api/v1")
app.include_router(alertas_router, prefix="/api/v1")

@app.get("/health", tags=["system"])
async def health_check():
    return {"status": "ok", "app": settings.APP_NAME, "env": settings.APP_ENV}
