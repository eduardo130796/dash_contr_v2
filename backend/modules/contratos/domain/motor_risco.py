from enum import Enum
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class NivelSaude(str, Enum):
    EXCELENTE = "excelente"
    ESTAVEL = "estável"
    ATENCAO = "atenção"
    CRITICO = "crítico"
    COLAPSO = "colapso"

class NivelCriticidade(str, Enum):
    BAIXA = "baixa"
    MEDIA = "média"
    ALTA = "alta"
    ESTRATEGICA = "estratégica"

class NivelRisco(str, Enum):
    BAIXO = "baixo"
    MODERADO = "moderado"
    ALTO = "alto"
    CRITICO = "crítico"

class FatorRisco(BaseModel):
    tipo: str
    impacto: int
    descricao: str

class ResumoOperacional(BaseModel):
    possui_alertas_criticos: bool
    quantidade_alertas: int
    sync_ok: bool
    compliance_ok: bool

class AnalysisResult(BaseModel):
    saude_score: int
    saude_nivel: str
    criticidade: str
    risco_score: int
    risco_nivel: str
    fatores: List[FatorRisco]
    resumo_operacional: ResumoOperacional

class MotorRisco:
    # Mapeamento do tipo de alerta para impacto negativo na saúde
    PENALIZACOES = {
        "missing_guarantee": {"impacto": -20, "descricao": "Garantia ausente"},
        "guarantee_expiration": {"impacto": -10, "descricao": "Garantia vencendo/vencida"},
        "missing_responsible": {"impacto": -15, "descricao": "Responsável ausente"},
        "contract_expiration": {"impacto": -15, "descricao": "Contrato próximo ao vencimento"},
        "contract_expired": {"impacto": -35, "descricao": "Contrato vencido"}, # Caso tenhamos uma distinção no futuro
        "missing_closure": {"impacto": -20, "descricao": "Encerramento pendente"},
        "sync_failure": {"impacto": -8, "descricao": "Falha na sincronização"}
    }

    @classmethod
    def calcular(cls, contrato: Any, alertas: List[Any]) -> AnalysisResult:
        """
        Calcula os scores e níveis baseados nos alertas ativos de um contrato.
        Assume que o objeto `contrato` tem propriedades básicas e `alertas` são
        instâncias do banco ou schemas.
        """
        fatores: List[FatorRisco] = []
        
        saude_score = 100
        
        # 1. Processar Alertas para Saúde e Fatores
        for alerta in alertas:
            tipo = alerta.tipo if hasattr(alerta, 'tipo') else alerta.get('tipo', '')
            
            # Ajuste de contrato vencido vs vencendo (se necessário baseado na severidade ou metadata)
            # Vamos tratar apenas com o tipo para simplificar e seguir a regra de negócio
            if tipo == "contract_expiration":
                metadata = alerta.metadata_json if hasattr(alerta, 'metadata_json') else alerta.get('metadata_json', {})
                days = metadata.get('days_to_expire', 999)
                if days < 0:
                    tipo_real = "contract_expired"
                    impacto = -35
                    descricao = "Contrato vencido"
                else:
                    tipo_real = tipo
                    impacto = cls.PENALIZACOES.get(tipo, {}).get("impacto", -10)
                    descricao = "Contrato próximo ao vencimento"
            else:
                tipo_real = tipo
                regra = cls.PENALIZACOES.get(tipo, {})
                impacto = regra.get("impacto", -5) # default -5 se não mapeado
                descricao = regra.get("descricao", f"Alerta ativo: {tipo}")
                
            saude_score += impacto
            
            fatores.append(FatorRisco(
                tipo=tipo_real,
                impacto=impacto,
                descricao=descricao
            ))
            
        saude_score = max(0, min(100, saude_score))
        
        # 2. Definir Nível de Saúde
        saude_nivel = cls._determinar_nivel_saude(saude_score)
        
        # 3. Determinar Criticidade (Mockada/Heurística por enquanto, se não houver no banco)
        # Se houver um campo no contrato que defina, usamos ele.
        # Por padrão, vamos fazer uma regra simples: valor alto = alta
        criticidade = cls._determinar_criticidade(contrato)
        
        # 4. Calcular Risco Consolidado
        # O Risco é o inverso da Saúde, ponderado pela Criticidade
        risco_base = 100 - saude_score
        multiplicador = {
            NivelCriticidade.BAIXA: 0.8,
            NivelCriticidade.MEDIA: 1.0,
            NivelCriticidade.ALTA: 1.2,
            NivelCriticidade.ESTRATEGICA: 1.5
        }.get(criticidade, 1.0)
        
        risco_score = int(risco_base * multiplicador)
        risco_score = max(0, min(100, risco_score))
        
        risco_nivel = cls._determinar_nivel_risco(risco_score)
        
        # 5. Resumo Operacional
        # Determinar possivelmente baseado nos alertas
        possui_alertas_criticos = any(
            (hasattr(a, 'severidade') and a.severidade == 'red') or 
            (isinstance(a, dict) and a.get('severidade') == 'red') 
            for a in alertas
        )
        sync_ok = not any(f.tipo == "sync_failure" for f in fatores)
        
        # compliance: ausência de responsáveis, garantias, etc.
        compliance_tipos = ["missing_guarantee", "guarantee_expiration", "missing_responsible", "missing_closure"]
        compliance_ok = not any(f.tipo in compliance_tipos for f in fatores)

        resumo_operacional = ResumoOperacional(
            possui_alertas_criticos=possui_alertas_criticos,
            quantidade_alertas=len(alertas),
            sync_ok=sync_ok,
            compliance_ok=compliance_ok
        )
        
        return AnalysisResult(
            saude_score=saude_score,
            saude_nivel=saude_nivel.value,
            criticidade=criticidade.value,
            risco_score=risco_score,
            risco_nivel=risco_nivel.value,
            fatores=fatores,
            resumo_operacional=resumo_operacional
        )
        
    @staticmethod
    def _determinar_nivel_saude(score: int) -> NivelSaude:
        if score >= 90:
            return NivelSaude.EXCELENTE
        elif score >= 70:
            return NivelSaude.ESTAVEL
        elif score >= 50:
            return NivelSaude.ATENCAO
        elif score >= 30:
            return NivelSaude.CRITICO
        else:
            return NivelSaude.COLAPSO
            
    @staticmethod
    def _determinar_criticidade(contrato: Any) -> NivelCriticidade:
        # Tenta pegar a criticidade existente se estiver salva
        if isinstance(contrato, dict):
            c_str = contrato.get("criticidade")
            valor = contrato.get("valor", 0)
        else:
            c_str = getattr(contrato, "criticidade", None)
            
            # Tentar achar o valor pelo json
            valor = 0
            raw_contract = getattr(contrato, "raw_contract", None)
            if raw_contract and isinstance(raw_contract, dict):
                raw_value = str(raw_contract.get("valor_global", 0))

                valor = float(
                    raw_value
                    .replace(".", "")
                    .replace(",", ".")
                )

        if c_str and isinstance(c_str, str):
            c_str = c_str.lower()
            if "estrategic" in c_str or "estratégic" in c_str:
                return NivelCriticidade.ESTRATEGICA
            elif "alta" in c_str:
                return NivelCriticidade.ALTA
            elif "media" in c_str or "média" in c_str:
                return NivelCriticidade.MEDIA
            elif "baixa" in c_str:
                return NivelCriticidade.BAIXA

        # Heurística se não houver explicitamente
        if valor > 1000000:
            return NivelCriticidade.ESTRATEGICA
        elif valor > 500000:
            return NivelCriticidade.ALTA
        elif valor > 100000:
            return NivelCriticidade.MEDIA
        else:
            return NivelCriticidade.BAIXA

    @staticmethod
    def _determinar_nivel_risco(score: int) -> NivelRisco:
        if score >= 80:
            return NivelRisco.CRITICO
        elif score >= 60:
            return NivelRisco.ALTO
        elif score >= 30:
            return NivelRisco.MODERADO
        else:
            return NivelRisco.BAIXO
