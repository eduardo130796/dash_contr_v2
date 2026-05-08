import math
from datetime import datetime, date, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession

from backend.modules.contratos.repositories.repositories import ContratoRepository
from backend.modules.contratos.schemas.schemas import (
    ContractListResponse, 
    ContractListItem, 
    PaginationInfo,
    Contrato360Response,
    ResumoContratoSchema,
    FinanceiroSchema,
    FinanceiroExercicioSchema,
    EventoTimelineSchema,
    RiscoSchema,
    AlertaSchema,
    AditivoSchema,
    ExecucaoSchema,
    GrupoResponsavelSchema,
    PessoaResponsavelSchema
)


class ContratoService:
    def __init__(self, session: AsyncSession):
        self.repository = ContratoRepository(session)

    async def list_contracts(
        self,
        page: int = 1,
        limit: int = 20,
        search: Optional[str] = None,
        status: Optional[str] = None,
        criticality: Optional[str] = None,
        category: Optional[str] = None,
        sort_by: str = "vigencia_fim",
        order: str = "desc",
    ) -> ContractListResponse:
        items, total = await self.repository.list_contracts(
            page=page,
            limit=limit,
            search=search,
            status=status,
            criticality=criticality,
            category=category,
            sort_by=sort_by,
            order=order,
        )

        contract_items = []
        for item in items:
            raw = item.raw_contract or {}
            analysis = item.analysis or {}
            
            fornecedor = raw.get("fornecedor", {})
            fornecedor_nome = fornecedor.get("nome") if isinstance(fornecedor, dict) else str(fornecedor)

            valor = self._parse_money(raw.get("valor_global") or raw.get("valor_inicial"))

            # Consolidação da situação real
            situacao = analysis.get("status_real") or item.status or "indefinido"
            if situacao == "active": situacao = "ativo"

            contract_items.append(
                ContractListItem(
                    id=item.id,
                    contract_number=item.contract_number,
                    object=raw.get("objeto") or "Sem objeto",
                    contractor=fornecedor_nome or "Desconhecido",
                    end_date=raw.get("vigencia_fim"),
                    manager=raw.get("gestor") or "Não atribuído",
                    status=situacao,
                    criticality=analysis.get("criticality") or "low",
                    risk_score=analysis.get("risk_score"),
                    category=analysis.get("category") or raw.get("categoria"),
                    value=valor
                )
            )

        pages = math.ceil(total / limit) if total > 0 else 0

        return ContractListResponse(
            items=contract_items,
            pagination=PaginationInfo(
                page=page,
                limit=limit,
                total=total,
                pages=pages
            )
        )

    async def get_contract_360(self, contract_id: str) -> Optional[Contrato360Response]:
        """
        Gera a visão analítica consolidada do contrato (Contract 360).
        SSOT absoluto para o frontend.
        """
        contrato = await self.repository.get_by_id(contract_id)
        if not contrato:
            return None

        raw = contrato.raw_contract or {}
        analysis = contrato.analysis or {}
        today = datetime.now(timezone.utc).date()

        # 1. RESUMO
        vencimento_str = raw.get("vigencia_fim") or raw.get("data_fim_vigencia")
        vencimento_dt = self._parse_date(vencimento_str)
        dias_restantes = (vencimento_dt - today).days if vencimento_dt else None

        fornecedor = raw.get("fornecedor", {})
        if isinstance(fornecedor, dict):
            fornecedor_nome = fornecedor.get("nome") or fornecedor.get("razao_social")
        else:
            fornecedor_nome = str(fornecedor)

        # Garantir situacao_real
        situacao = analysis.get("status_real") or contrato.status or "indefinido"
        if situacao in ["active", "ativo"]:
            if dias_restantes is not None:
                if dias_restantes < 0:
                    situacao = "vencido"
                elif dias_restantes <= 30:
                    situacao = "vencendo"
                else:
                    situacao = "ativo"
            else:
                situacao = "ativo"

        resumo = ResumoContratoSchema(
            numero=contrato.contract_number,
            objeto=raw.get("objeto") or "Objeto não informado",
            fornecedor=fornecedor_nome or "Desconhecido",
            categoria=analysis.get("category") or raw.get("categoria") or "Outros",
            unidade=raw.get("unidade_compra", {}).get("nome") if isinstance(raw.get("unidade_compra"), dict) else (raw.get("orgao_entidade", {}).get("razao_social") if isinstance(raw.get("orgao_entidade"), dict) else None),
            modalidade=raw.get("modalidade") or raw.get("modalidade_licitacao"),
            processo=raw.get("processo") or raw.get("numero_processo"),
            situacao_real=situacao,
            is_estrategico=analysis.get("is_strategic") or raw.get("is_strategic") or False,
            vencimento=vencimento_str,
            dias_restantes=dias_restantes,
            valor_global=self._parse_money(raw.get("valor_global") or raw.get("valor_inicial")),
            gestor=raw.get("gestor") or "Não atribuído"
        )

        # 2. FINANCEIRO
        empenhos_brutos = self._ensure_list(contrato.raw_empenhos)
        financeiro = self._compose_financial(empenhos_brutos)

        # 3. TIMELINE (Histórico)
        # Consolida historico dedicado + eventos do contrato principal
        historico_base = self._ensure_list(contrato.raw_historico)
        eventos_contract = self._ensure_list(raw.get("eventos"))
        timeline = self._compose_timeline(historico_base + eventos_contract)

        # 4. RISCOS
        score = analysis.get("risk_score") or 0
        riscos = RiscoSchema(
            score=score,
            saude=max(0, 100 - score),
            nivel=self._derive_risk_level(score),
            fatores=analysis.get("risk_factors") or []
        )

        # 5. ALERTAS
        alertas_raw = analysis.get("flags") or []
        alertas = [
            AlertaSchema(
                id=f"alert-{i}",
                tipo="automatico",
                titulo=a.get("title") or a.get("titulo") or "Alerta de Sistema",
                descricao=a.get("message") or a.get("descricao") or "",
                severidade=a.get("severity") or a.get("severidade") or "blue",
                data=a.get("date") or datetime.now(timezone.utc).isoformat()
            ) for i, a in enumerate(alertas_raw)
        ]

        # 6. ADITIVOS
        aditivos_raw = raw.get("aditivos") or [] 
        aditivos = [
            AditivoSchema(
                numero=a.get("numero") or f"Aditivo {i+1}",
                tipo=a.get("tipo") or "Outros",
                descricao=a.get("objeto") or a.get("descricao") or "",
                data_assinatura=a.get("data_assinatura"),
                valor_alteracao=self._parse_money(a.get("valor_aditivo") or a.get("valor_alteracao")),
                status=a.get("status") or "Ativo"
            ) for i, a in enumerate(aditivos_raw)
        ]

        # 7. EXECUÇÃO
        itens_raw = self._ensure_list(contrato.raw_itens)
        itens_processados = self._compose_items(itens_raw)
        execucao = ExecucaoSchema(
            percentual_tempo=self._calculate_time_progress(raw.get("vigencia_inicio") or raw.get("data_inicio_vigencia"), vencimento_str),
            percentual_financeiro=financeiro.execucao_global,
            itens=itens_processados
        )

        # 8. RESPONSÁVEIS
        responsaveis_raw = self._ensure_list(contrato.raw_responsaveis)
        responsaveis = self._compose_responsibles(responsaveis_raw)

        return Contrato360Response(
            resumo=resumo,
            financeiro=financeiro,
            timeline=timeline,
            alertas=alertas,
            riscos=riscos,
            aditivos=aditivos,
            execucao=execucao,
            responsaveis=responsaveis,
            garantias=self._ensure_list(contrato.raw_garantias),
            metadata={
                "last_sync": contrato.last_sync_at.isoformat() if contrato.last_sync_at else None,
                "status_sync": contrato.empenhos_status,
                "faturas": self._ensure_list(contrato.raw_faturas),
                "recommended_actions": analysis.get("recommended_actions") or []
            }
        )

    # ─── HELPERS PRIVADOS ───

    def _parse_money(self, value) -> float:
        if not value: return 0.0
        try:
            # Se já for float/int, apenas retorna
            if isinstance(value, (int, float)): return float(value)
            
            # Limpa string (remove R$, espaços, etc)
            s = str(value).replace("R$", "").replace("\xa0", "").strip()
            
            # Detecta formato brasileiro (1.234,56)
            if "," in s and "." in s:
                # Se tem ponto e vírgula, o ponto é separador de milhar
                s = s.replace(".", "").replace(",", ".")
            elif "," in s:
                # Se tem apenas vírgula, é o separador decimal
                s = s.replace(",", ".")
            
            return float(s)
        except:
            return 0.0

    def _parse_date(self, value) -> Optional[date]:
        if not value: return None
        try:
            # Tenta formato ISO (YYYY-MM-DD)
            return date.fromisoformat(str(value)[:10])
        except:
            try:
                # Tenta formato BR (DD/MM/YYYY)
                return datetime.strptime(str(value)[:10], "%d/%m/%Y").date()
            except:
                return None

    def _ensure_list(self, data: Any) -> list:
        if not data: return []
        if isinstance(data, list): return data
        if isinstance(data, dict):
            # Procura por chaves comuns de listas em APIs
            for key in ["data", "itens", "items", "empenhos", "faturas", "historico", "eventos"]:
                if key in data and isinstance(data[key], list):
                    return data[key]
            return [data] # Retorna o dict como único item se não encontrar lista interna
        return []

    def _compose_financial(self, empenhos: list) -> FinanceiroSchema:
        ano_atual = datetime.now().year
        exercicios_dict = {}
        total_pago = 0.0
        total_empenhado = 0.0

        for e in empenhos:
            try:
                dt = self._parse_date(e.get("data_emissao"))
                ano = dt.year if dt else ano_atual
                
                # No Comprasnet, 'pago' pode estar como 'valor_pago' ou 'liquidado'
                pago = self._parse_money(e.get("pago") or e.get("liquidado") or e.get("rppago"))
                emp = self._parse_money(e.get("empenhado") or e.get("valor"))
                rp = self._parse_money(e.get("rpinscrito") or 0)

                if ano not in exercicios_dict:
                    exercicios_dict[ano] = {"ano": ano, "pago": 0.0, "empenhado": 0.0, "rp": 0.0, "itens": []}
                
                exercicios_dict[ano]["pago"] += pago
                exercicios_dict[ano]["empenhado"] += emp
                exercicios_dict[ano]["rp"] += rp
                
                # Enriquece o item com informações legíveis para o frontend
                e_copy = dict(e)
                e_copy["pago"] = pago
                e_copy["empenhado"] = emp
                e_copy["finalidade"] = e.get("observacao") or e.get("planointerno") or e.get("naturezadespesa")
                
                exercicios_dict[ano]["itens"].append(e_copy)

                total_pago += pago
                total_empenhado += emp
            except:
                continue

        exercicios = []
        for ano, data in exercicios_dict.items():
            exec_perc = (data["pago"] / data["empenhado"] * 100) if data["empenhado"] > 0 else 0
            exercicios.append(FinanceiroExercicioSchema(**data, execucao=exec_perc))

        # Ordenar anos decrescente
        exercicios.sort(key=lambda x: x.ano, reverse=True)

        exec_global = (total_pago / total_empenhado * 100) if total_empenhado > 0 else 0

        return FinanceiroSchema(
            total_pago=total_pago,
            total_empenhado=total_empenhado,
            execucao_global=exec_global,
            ano_atual=ano_atual,
            exercicios=exercicios
        )

    def _compose_timeline(self, historico: list) -> list[EventoTimelineSchema]:
        timeline = []
        for h in historico:
            # Tenta várias chaves de data possíveis em históricos de contratos
            data = h.get("data_ocorrencia") or h.get("data_assinatura") or h.get("data_publicacao") or h.get("data_registro")
            
            tipo = h.get("tipo") or h.get("situacao_contrato") or "Evento"
            titulo = h.get("titulo") or h.get("numero_termo") or h.get("descricao_tipo") or f"Termo {tipo}"
            
            timeline.append(
                EventoTimelineSchema(
                    data=str(data) if data else "",
                    tipo=str(tipo),
                    titulo=str(titulo),
                    descricao=h.get("descricao") or h.get("objeto") or "Registro oficial no histórico do contrato.",
                    ator=h.get("usuario") or h.get("responsavel")
                )
            )
        
        # Filtra eventos sem data (se houver) e ordena
        timeline = [t for t in timeline if t.data]
        timeline.sort(key=lambda x: x.data, reverse=True)
        return timeline

    def _derive_risk_level(self, score: int) -> str:
        if score >= 75: return "crítico"
        if score >= 50: return "alto"
        if score >= 30: return "médio"
        return "baixo"

    def _calculate_time_progress(self, inicio, fim) -> float:
        d_ini = self._parse_date(inicio)
        d_fim = self._parse_date(fim)
        if not d_ini or not d_fim: return 0.0
        
        today = date.today()
        if today < d_ini: return 0.0
        if today > d_fim: return 100.0
        
        total_days = (d_fim - d_ini).days
        elapsed_days = (today - d_ini).days
        
        return (elapsed_days / total_days * 100) if total_days > 0 else 0.0

    def _compose_responsibles(self, raw: list) -> List[GrupoResponsavelSchema]:
        grupos = {
            "gestor": {"titulo": "Gestor do Contrato", "principal": None, "substituto": None},
            "tecnico": {"titulo": "Fiscal Técnico", "principal": None, "substituto": None},
            "administrativo": {"titulo": "Fiscal Administrativo", "principal": None, "substituto": None},
        }

        for r in raw:
            try:
                funcao = r.get("funcao_id", "").lower()
                usuario = r.get("usuario", "")
                nome = usuario.split(" - ")[1] if " - " in usuario else usuario
                cpf = usuario.split(" - ")[0] if " - " in usuario else None
                
                pessoa = PessoaResponsavelSchema(
                    nome=nome,
                    cpf=cpf,
                    situacao=r.get("situacao") or "Ativo",
                    tipo="Substituto" if "substituto" in funcao else "Titular"
                )

                # Normalização robusta para comparação
                funcao_norm = funcao.replace("é", "e").replace("á", "a").replace("í", "i").replace("ó", "o").replace("ú", "u")
                
                target = None
                if "gestor" in funcao_norm: target = "gestor"
                elif "tecnico" in funcao_norm: target = "tecnico"
                elif "administrativo" in funcao_norm: target = "administrativo"

                if target:
                    if "substituto" in funcao:
                        grupos[target]["substituto"] = pessoa
                    else:
                        grupos[target]["principal"] = pessoa
            except:
                continue

        return [GrupoResponsavelSchema(**g) for g in grupos.values() if g["principal"] or g["substituto"]]

    def _compose_items(self, raw_itens: list) -> list:
        processed = []
        for item in raw_itens:
            try:
                historico = item.get("historico_item") or []
                # Ordenar histórico decrescente
                historico.sort(key=lambda x: x.get("data_termo") or "", reverse=True)
                
                last_event = None
                if historico:
                    last = historico[0]
                    last_event = {
                        "tipo": self._normalize_tipo_item(last.get("tipo_historico")),
                        "data": last.get("data_termo"),
                        "valor": self._parse_money(last.get("valor_unitario"))
                    }

                processed.append({
                    "id": item.get("id"),
                    "descricao": item.get("descricao_complementar") or item.get("catmatseritem_id") or "Item",
                    "quantidade": item.get("quantidade"),
                    "tipo": item.get("tipo_id"),
                    "valor_unitario": self._parse_money(item.get("valorunitario")),
                    "last_event": last_event,
                    "historico": historico,
                    "grupo": item.get("grupo_id"),
                    "numero_item": item.get("numero_item_compra")
                })
            except:
                continue
        return processed

    def _normalize_tipo_item(self, tipo: str) -> str:
        if not tipo: return "Atualização"
        t = tipo.lower()
        if "repact" in t: return "Repactuação"
        if "apostil" in t: return "Reajuste"
        if "adit" in t: return "Aditivo"
        return tipo
