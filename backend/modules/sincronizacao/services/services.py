import httpx
import hashlib
import json
import uuid
import asyncio
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend.core.config.config import settings
from backend.core.logging.logger import log
from backend.modules.contratos.models.models import Contrato
from backend.modules.contratos.repositories.repositories import ContratoRepository
from backend.modules.sincronizacao.models.models import SyncExecution
from backend.core.exceptions.exceptions import BusinessException

# Proteção global contra concorrência para contratos específicos
_sync_locks: dict[str, asyncio.Lock] = {}

class SincronizacaoService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = ContratoRepository(session)
        self.api_url = settings.CONTRATOS_API_URL
        self.timeout = httpx.Timeout(60.0, connect=30.0)
        self.endpoints_secundarios = [
            "empenhos", "faturas", "historico", 
            "garantias", "responsaveis", "itens"
        ]
        self.chunk_size = 50
        self.rate_limit = settings.SYNC_RATE_LIMIT

    def _get_lock(self, external_id: str) -> asyncio.Lock:
        if external_id not in _sync_locks:
            _sync_locks[external_id] = asyncio.Lock()
        return _sync_locks[external_id]

    def _generate_hash(self, data: dict | list | None) -> str | None:
        if not data:
            return None
        serialized = json.dumps(data, sort_keys=True, separators=(',', ':'))
        return hashlib.sha256(serialized.encode('utf-8')).hexdigest()

    def _verificar_vigencia(self, data_fim_str: str | None) -> tuple[bool, str]:
        if not data_fim_str:
            return True, "vigencia_indefinida"
        try:
            data_fim = datetime.strptime(data_fim_str[:10], "%Y-%m-%d").date()
            hoje = datetime.now(timezone.utc).date()
            if data_fim >= hoje:
                return True, "ativo"
            else:
                return False, "vencido"
        except Exception as e:
            log.warning("Erro ao fazer parse da data de vigencia", data=data_fim_str, erro=str(e))
            return True, "vigencia_indefinida"

    def _extrair_campos_principais(self, item: dict) -> tuple[str, str, str | None]:
        external_id = str(item.get("id"))
        contract_number = item.get("numero")
        data_fim_str = item.get("vigencia_fim")
        return external_id, contract_number, data_fim_str

    async def _fetch_url(self, client: httpx.AsyncClient, url: str) -> tuple[dict | list | None, str]:
        try:
            response = await client.get(url)
            response.raise_for_status()
            return response.json(), "success"
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                return None, "success" # 404 não é erro do endpoint, apenas sem dados associados
            log.error("Erro HTTP ao buscar dados", url=url, status_code=e.response.status_code)
            return None, "failed"
        except httpx.RequestError as e:
            log.error("Erro de requisição ao buscar dados", url=url, erro=str(e))
            return None, "failed"

    async def _get_or_create_execution(self, exec_type: str) -> SyncExecution:
        result = await self.session.execute(
            select(SyncExecution).filter(
                SyncExecution.type == exec_type,
                SyncExecution.status.in_(['running', 'paused', 'failed'])
            ).order_by(SyncExecution.started_at.desc())
        )
        execution = result.scalars().first()
        
        if not execution:
            execution = SyncExecution(
                id=str(uuid.uuid4()),
                type=exec_type,
                status='running'
            )
            self.session.add(execution)
            await self.session.commit()
            log.info("Nova execução criada", exec_id=execution.id, type=exec_type)
        else:
            execution.retry_count += 1
            execution.status = 'running'
            await self.session.commit()
            log.info("Retomando execução pendente", exec_id=execution.id, type=exec_type, retry_count=execution.retry_count, last_page=execution.last_page_processed)
            
        return execution

    async def sync_bootstrap(self):
        log.info("Iniciando sincronização BOOTSTRAP...")
        await self._run_sync_loop(exec_type="bootstrap")

    async def sync_incremental(self):
        log.info("Iniciando sincronização INCREMENTAL...")
        await self._run_sync_loop(exec_type="incremental")

    async def _run_sync_loop(self, exec_type: str):
        execution = await self._get_or_create_execution(exec_type)
        
        async with httpx.AsyncClient(timeout=self.timeout, verify=False) as client:
            try:
                log.info("Buscando listagem completa da API (Payload Único)...", url=self.api_url)
                dados_api, status = await self._fetch_url(client, self.api_url)
                
                if status == "failed" or not dados_api:
                    log.error("Falha ao obter lista principal. Abortando execução para tentar depois.")
                    execution.status = 'failed'
                    await self.session.commit()
                    return
                
                lista_contratos = dados_api.get('data', []) if isinstance(dados_api, dict) else (dados_api if isinstance(dados_api, list) else [dados_api])
                total_items = len(lista_contratos)
                log.info(f"Total de contratos retornados pela API: {total_items}")
                
                chunks = [lista_contratos[i:i + self.chunk_size] for i in range(0, total_items, self.chunk_size)]
                total_pages = len(chunks)
                
                for page_idx, chunk in enumerate(chunks):
                    if page_idx < execution.last_page_processed:
                        continue
                        
                    log.info(f"Processando lote {page_idx + 1}/{total_pages}...")
                    
                    for item in chunk:
                        external_id = str(item.get("id"))
                        # Utiliza a proteção de concorrência mesmo no batch
                        lock = self._get_lock(external_id)
                        async with lock:
                            success = await self._processar_contrato(client, item, exec_type)
                            if success:
                                execution.processed_contracts += 1
                            else:
                                execution.failed_contracts += 1
                            
                    execution.last_page_processed = page_idx + 1
                    await self.session.commit()
                    log.info(f"Checkpoint salvo: Lote {page_idx + 1} concluído.")
                    
                execution.status = 'completed'
                execution.completed_at = datetime.now(timezone.utc)
                await self.session.commit()
                log.info("Sincronização concluída com sucesso.", exec_id=execution.id)

            except Exception as e:
                log.error("Erro crítico na varredura", exc_info=True)
                execution.status = 'failed'
                execution.error_log = {"error": str(e)}
                await self.session.commit()

    async def _processar_contrato(self, client: httpx.AsyncClient, item: dict, exec_type: str) -> bool:
        external_id, contract_number, data_fim_str = self._extrair_campos_principais(item)
        if not external_id or external_id == "None":
            return False
            
        is_active, status = self._verificar_vigencia(data_fim_str)
        main_hash = self._generate_hash(item)
        
        contrato = await self.repo.get_by_external_id(external_id)
        
        if not contrato:
            contrato = Contrato(
                id=str(uuid.uuid4()),
                external_id=external_id,
                contract_number=contract_number,
                is_active=is_active,
                status=status,
                main_hash=main_hash,
                raw_contract=item,
                last_sync_at=datetime.now(timezone.utc),
                last_main_update_at=datetime.now(timezone.utc)
            )
            await self.repo.create(contrato)
            log.info("Contrato NOVO inserido", external_id=external_id)
        else:
            atualizar_banco = False
            if contrato.status != status or contrato.is_active != is_active:
                contrato.status = status
                contrato.is_active = is_active
                atualizar_banco = True
                
            if contrato.main_hash != main_hash:
                contrato.main_hash = main_hash
                contrato.raw_contract = item
                contrato.last_main_update_at = datetime.now(timezone.utc)
                atualizar_banco = True
                
            if atualizar_banco:
                contrato.last_sync_at = datetime.now(timezone.utc)
                await self.repo.update(contrato)
                log.info("Contrato atualizado (main_hash)", external_id=external_id)
                
        # Enriquecimento Secundário
        if is_active:
            await self._processar_secundarios(client, contrato, external_id)
        
        return True

    async def _processar_secundarios(self, client: httpx.AsyncClient, contrato: Contrato, external_id: str, endpoint_filter: str = None):
        base_url = f"https://contratos.comprasnet.gov.br/api/contrato/{external_id}"
        atualizou_algo = False
        
        endpoints = [endpoint_filter] if endpoint_filter else self.endpoints_secundarios
        
        for endpoint in endpoints:
            # Rate limiting para não agredir a API do Governo
            await asyncio.sleep(self.rate_limit)
            
            url = f"{base_url}/{endpoint}"
            dados_secundarios, request_status = await self._fetch_url(client, url)
            
            status_prop = f"{endpoint}_status"
            
            if request_status == "failed":
                log.warning("Endpoint secundário falhou (MANTENDO JSONB ANTERIOR)", external_id=external_id, endpoint=endpoint)
                setattr(contrato, status_prop, "failed")
                contrato.last_failed_sync_at = datetime.now(timezone.utc)
                atualizou_algo = True
                continue
                
            if dados_secundarios is not None:
                novo_hash = self._generate_hash(dados_secundarios)
                hash_atual = getattr(contrato, f"{endpoint}_hash", None)
                
                if hash_atual != novo_hash:
                    setattr(contrato, f"{endpoint}_hash", novo_hash)
                    setattr(contrato, f"raw_{endpoint}", dados_secundarios)
                    setattr(contrato, status_prop, "success")
                    atualizou_algo = True
                    log.info("Endpoint enriquecido", external_id=external_id, endpoint=endpoint)
                else:
                    if getattr(contrato, status_prop) != "success":
                        setattr(contrato, status_prop, "success")
                        atualizou_algo = True
            else:
                if getattr(contrato, status_prop) != "success":
                    setattr(contrato, status_prop, "success")
                    atualizou_algo = True
                    
        if atualizou_algo:
            contrato.last_operational_update_at = datetime.now(timezone.utc)
            contrato.last_success_sync_at = datetime.now(timezone.utc)
            await self.repo.update(contrato)

    # =========================================================================
    # SINCRONIZAÇÃO SOB DEMANDA (ON-DEMAND)
    # =========================================================================

    async def sync_contrato_on_demand(self, external_id: str) -> dict:
        lock = self._get_lock(external_id)
        
        if lock.locked():
            log.warning("Tentativa de concorrência detectada. Aguardando lock...", external_id=external_id)
            
        async with lock:
            log.info("Iniciando refresh manual de contrato", external_id=external_id)
            async with httpx.AsyncClient(timeout=self.timeout, verify=False) as client:
                # Na ausência de um endpoint que devolva UM único contrato no Comprasnet de forma clara,
                # Teríamos que buscar o endpoint detalhado se ele existir, 
                # ou buscar da lista principal e varrer (ineficiente).
                # No comprasnet, a base URL costuma responder os dados dele próprio:
                base_url = f"https://contratos.comprasnet.gov.br/api/contrato/{external_id}"
                dados_api, status = await self._fetch_url(client, base_url)
                
                if status == "failed" or not dados_api:
                    raise BusinessException(message="Falha ao obter contrato principal da API para refresh", status_code=502)
                
                # Se for uma lista (ex: buscar pelo numero), adaptamos. Se for dict (o contrato direto):
                if isinstance(dados_api, list):
                    item = dados_api[0] if dados_api else None
                else:
                    item = dados_api
                    
                if not item:
                    raise BusinessException(message="Contrato não encontrado na API", status_code=404)
                    
                # Processa exatamente como a rotina oficial
                await self._processar_contrato(client, item, exec_type="on-demand")
                
            return {"status": "success", "message": f"Contrato {external_id} atualizado com sucesso"}

    async def sync_endpoint_on_demand(self, external_id: str, endpoint: str) -> dict:
        if endpoint not in self.endpoints_secundarios:
            raise BusinessException(message=f"Endpoint inválido. Permitidos: {self.endpoints_secundarios}", status_code=400)
            
        lock = self._get_lock(external_id)
        
        if lock.locked():
            log.warning("Tentativa de concorrência detectada. Aguardando lock...", external_id=external_id)
            
        async with lock:
            contrato = await self.repo.get_by_external_id(external_id)
            if not contrato:
                raise BusinessException(message="Contrato base não encontrado no sistema", status_code=404)
                
            log.info("Iniciando refresh manual de endpoint", external_id=external_id, endpoint=endpoint)
            async with httpx.AsyncClient(timeout=self.timeout, verify=False) as client:
                await self._processar_secundarios(client, contrato, external_id, endpoint_filter=endpoint)
                
            return {"status": "success", "message": f"Endpoint {endpoint} do contrato {external_id} atualizado"}
