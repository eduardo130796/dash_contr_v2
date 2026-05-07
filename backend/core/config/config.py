import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    APP_NAME: str = "Plataforma Contratual"
    APP_ENV: str = "development"
    APP_DEBUG: bool = True
    
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    
    DATABASE_URL: str
    SUPABASE_URL: str
    CONTRATOS_API_URL: str
    LOG_LEVEL: str = "INFO"
    SYNC_RATE_LIMIT: float = 1.0
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()

# Garantir que a URL do SQLAlchemy use psycopg
if settings.DATABASE_URL.startswith("postgresql://"):
    settings.DATABASE_URL = settings.DATABASE_URL.replace("postgresql://", "postgresql+psycopg://")
