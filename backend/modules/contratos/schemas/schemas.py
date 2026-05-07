from pydantic import BaseModel, ConfigDict
from typing import Optional, Any, Dict
from datetime import datetime

class ContratoBase(BaseModel):
    external_id: str
    contract_number: str
    is_active: bool
    status: Optional[str] = None

class ContratoResponse(ContratoBase):
    id: str
    main_hash: Optional[str] = None
    empenhos_hash: Optional[str] = None
    faturas_hash: Optional[str] = None
    last_sync_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class ContratoDetailResponse(ContratoResponse):
    raw_contract: Optional[Any] = None
    raw_empenhos: Optional[Any] = None
    raw_faturas: Optional[Any] = None
    raw_historico: Optional[Any] = None
    raw_garantias: Optional[Any] = None
    raw_responsaveis: Optional[Any] = None
    raw_itens: Optional[Any] = None

    analysis: Optional[Any] = None
