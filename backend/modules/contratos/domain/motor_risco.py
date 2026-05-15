from enum import Enum
from typing import List, Any

from pydantic import BaseModel


class NivelSaude(str, Enum):
    SAUDAVEL = "saudável"
    ATENCAO = "atenção"
    COMPROMETIDA = "comprometida"
    CRITICA = "crítica"
    COLAPSO = "colapso"


class NivelCriticidade(str, Enum):
    NORMAL = "normal"
    ATENCAO = "atenção"
    URGENTE = "urgente"
    CRITICA = "crítica"


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

    risco_score: int
    risco_nivel: str

    criticidade: str

    fatores: List[FatorRisco]
    resumo_operacional: ResumoOperacional


class MotorRisco:

    PENALIZACOES = {
        "missing_guarantee": {
            "impacto": -15,
            "descricao": "Garantia ausente"
        },

        "guarantee_expiration": {
            "impacto": -8,
            "descricao": "Garantia vencendo/vencida"
        },

        "missing_responsible": {
            "impacto": -10,
            "descricao": "Responsável ausente"
        },

        "contract_expiration": {
            "impacto": -10,
            "descricao": "Contrato próximo ao vencimento"
        },

        "contract_expired": {
            "impacto": -25,
            "descricao": "Contrato vencido"
        },

        "missing_closure": {
            "impacto": -12,
            "descricao": "Encerramento pendente"
        },

        "sync_failure": {
            "impacto": -5,
            "descricao": "Falha na sincronização"
        }
    }

    @classmethod
    def calcular(
        cls,
        contrato: Any,
        alertas: List[Any]
    ) -> AnalysisResult:

        fatores: List[FatorRisco] = []

        saude_score = 100

        # =========================================================
        # PROCESSAMENTO DOS ALERTAS
        # =========================================================

        for alerta in alertas:

            # Correção: O modelo Alerta usa o campo 'type', não 'tipo'
            tipo = getattr(alerta, "type", "") or ""

            if tipo == "contract_expiration":

                metadata = getattr(alerta, "metadata_json", {})

                days = metadata.get("days_to_expire", 999)

                if days < 0:
                    tipo_real = "contract_expired"

                    impacto = cls.PENALIZACOES[
                        "contract_expired"
                    ]["impacto"]

                    descricao = cls.PENALIZACOES[
                        "contract_expired"
                    ]["descricao"]

                else:
                    tipo_real = tipo

                    impacto = cls.PENALIZACOES[
                        tipo
                    ]["impacto"]

                    descricao = cls.PENALIZACOES[
                        tipo
                    ]["descricao"]

            else:

                tipo_real = tipo

                regra = cls.PENALIZACOES.get(tipo)

                # ALERTAS DESCONHECIDOS NÃO PENALIZAM
                if not regra:
                    impacto = 0
                    descricao = f"Alerta ativo: {tipo}"

                else:
                    impacto = regra["impacto"]
                    descricao = regra["descricao"]

            saude_score += impacto

            fatores.append(
                FatorRisco(
                    tipo=tipo_real,
                    impacto=impacto,
                    descricao=descricao
                )
            )

        # =========================================================
        # NORMALIZAÇÃO
        # =========================================================

        saude_score = max(0, min(100, saude_score))

        # =========================================================
        # SAÚDE
        # =========================================================

        saude_nivel = cls._determinar_nivel_saude(
            saude_score
        )

        # =========================================================
        # RISCO
        # =========================================================

        risco_score = 100 - saude_score

        risco_score = max(
            0,
            min(100, risco_score)
        )

        risco_nivel = cls._determinar_nivel_risco(
            risco_score
        )

        # =========================================================
        # CRITICIDADE OPERACIONAL
        # =========================================================

        # =========================================================
        # CRITICIDADE OPERACIONAL (SSOT DE PRIORIDADE)
        # =========================================================
        
        # Cálculo de dias para vencer (baseado na coluna física vigencia_fim)
        dias_para_vencer = 999
        if hasattr(contrato, "vigencia_fim") and contrato.vigencia_fim:
            from datetime import date
            dias_para_vencer = (contrato.vigencia_fim - date.today()).days

        criticidade = cls._determinar_criticidade(
            saude_score=saude_score,
            risco_score=risco_score,
            alertas=alertas,
            dias_para_vencer=dias_para_vencer
        )

        # =========================================================
        # RESUMO OPERACIONAL
        # =========================================================

        possui_alertas_criticos = any(
            getattr(a, "severidade", "") == "red"
            for a in alertas
        )

        sync_ok = not any(
            f.tipo == "sync_failure"
            for f in fatores
        )

        compliance_tipos = [
            "missing_guarantee",
            "guarantee_expiration",
            "missing_responsible",
            "missing_closure"
        ]

        compliance_ok = not any(
            f.tipo in compliance_tipos
            for f in fatores
        )

        resumo_operacional = ResumoOperacional(
            possui_alertas_criticos=possui_alertas_criticos,
            quantidade_alertas=len(alertas),
            sync_ok=sync_ok,
            compliance_ok=compliance_ok
        )

        return AnalysisResult(
            saude_score=saude_score,
            saude_nivel=saude_nivel.value,

            risco_score=risco_score,
            risco_nivel=risco_nivel.value,

            criticidade=criticidade.value,

            fatores=fatores,

            resumo_operacional=resumo_operacional
        )

    # =============================================================
    # NÍVEIS DE SAÚDE
    # =============================================================

    @staticmethod
    def _determinar_nivel_saude(
        score: int
    ) -> NivelSaude:

        if score >= 85:
            return NivelSaude.SAUDAVEL

        elif score >= 65:
            return NivelSaude.ATENCAO

        elif score >= 45:
            return NivelSaude.COMPROMETIDA

        elif score >= 20:
            return NivelSaude.CRITICA

        return NivelSaude.COLAPSO

    # =============================================================
    # NÍVEIS DE RISCO
    # =============================================================

    @staticmethod
    def _determinar_nivel_risco(
        score: int
    ) -> NivelRisco:

        if score >= 80:
            return NivelRisco.CRITICO

        elif score >= 60:
            return NivelRisco.ALTO

        elif score >= 30:
            return NivelRisco.MODERADO

        return NivelRisco.BAIXO

    # =============================================================
    # CRITICIDADE OPERACIONAL
    # =============================================================

    @staticmethod
    def _determinar_criticidade(
        saude_score: int,
        risco_score: int,
        alertas: List[Any],
        dias_para_vencer: int
    ) -> NivelCriticidade:
        """
        Lógica Híbrida: Prioriza urgência temporal e alertas críticos 
        sobre o score técnico de saúde.
        """
        
        alertas_criticos = sum(
            1
            for alerta in alertas
            if getattr(alerta, "severidade", "") == "red"
        )
        
        total_alertas = len(alertas)

        # 1. PRECEDÊNCIA TEMPORAL (Urgência Máxima)
        if dias_para_vencer <= 7:
            return NivelCriticidade.CRITICA
            
        if dias_para_vencer <= 15:
            return NivelCriticidade.URGENTE
            
        if dias_para_vencer <= 30:
            return NivelCriticidade.ATENCAO

        # 2. SEVERIDADE DE ALERTAS
        if alertas_criticos >= 3 or saude_score <= 20:
            return NivelCriticidade.CRITICA
            
        if alertas_criticos >= 2 or saude_score <= 45:
            return NivelCriticidade.URGENTE
            
        if alertas_criticos >= 1 or total_alertas >= 3 or saude_score <= 70:
            return NivelCriticidade.ATENCAO

        # 3. PADRÃO
        return NivelCriticidade.NORMAL