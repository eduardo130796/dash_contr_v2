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


class ContractListItem(BaseModel):
    """Item simplificado para listagem na tabela operacional."""
    id: str
    contract_number: str
    object: str
    contractor: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    manager: Optional[str] = None
    status: Optional[str] = None
    criticality: Optional[str] = None
    risk_score: Optional[int] = None
    category: Optional[str] = None
    value: float


class PaginationInfo(BaseModel):
    page: int
    limit: int
    total: int
    pages: int


class ContractListResponse(BaseModel):
    items: list[ContractListItem]
    pagination: PaginationInfo


# ─── SCHEMAS ANALÍTICOS (CONTRACT 360) ───

class ResumoContratoSchema(BaseModel):
    numero: str
    objeto: str
    fornecedor: str
    categoria: Optional[str] = None
    unidade: Optional[str] = None
    modalidade: Optional[str] = None
    processo: Optional[str] = None
    situacao_real: Optional[str] = None
    is_estrategico: bool = False
    inicio_vigencia: Optional[str] = None
    vencimento: Optional[str] = None
    dias_restantes: Optional[int] = None
    valor_global: float = 0.0
    gestor: Optional[str] = None


class FinanceiroExercicioSchema(BaseModel):
    ano: int
    pago: float
    empenhado: float
    rp: float
    execucao: float
    itens: list[dict] = []


class FinanceiroSchema(BaseModel):
    total_pago: float = 0.0
    total_empenhado: float = 0.0
    execucao_global: float = 0.0
    ano_atual: int
    exercicios: list[FinanceiroExercicioSchema] = []


class EventoTimelineSchema(BaseModel):
    data: str
    tipo: str
    titulo: str
    descricao: str
    ator: Optional[str] = None


class RiscoSchema(BaseModel):
    score: int
    saude: int
    nivel: str
    fatores: list[dict] = []


class AlertaSchema(BaseModel):
    id: str
    tipo: str
    titulo: str
    descricao: str
    severidade: str
    data: str


class AditivoSchema(BaseModel):
    numero: str
    tipo: str
    descricao: str
    data_assinatura: Optional[str] = None
    valor_alteracao: float = 0.0
    status: str


class ExecucaoSchema(BaseModel):
    percentual_tempo: float = 0.0
    percentual_financeiro: float = 0.0
    itens: list[dict] = []


class PessoaResponsavelSchema(BaseModel):
    nome: str
    cpf: Optional[str] = None
    situacao: str
    tipo: str # Titular / Substituto


class GrupoResponsavelSchema(BaseModel):
    titulo: str
    principal: Optional[PessoaResponsavelSchema] = None
    substituto: Optional[PessoaResponsavelSchema] = None


class Contrato360Response(BaseModel):
    resumo: ResumoContratoSchema
    financeiro: FinanceiroSchema
    timeline: list[EventoTimelineSchema] = []
    alertas: list[AlertaSchema] = []
    riscos: RiscoSchema
    aditivos: list[AditivoSchema] = []
    execucao: ExecucaoSchema
    responsaveis: list[GrupoResponsavelSchema] = []
    garantias: list[dict] = []
    metadata: Dict[str, Any] = {}

    model_config = ConfigDict(from_attributes=True)
