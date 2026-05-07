# Documentação dos Fluxos do Sistema

O backend foi arquitetado para preservar a modularidade e evitar gargalos e processamentos desnecessários em lote. A inteligência trafega em mão única.

## 1. Fluxo de Requisição da API Interna (Dashboard/Frontend)

Toda chamada à nossa plataforma segue o padrão **Router -> Service -> Repository -> Database**.

1. **Router (`routes.py`):** Recebe o HTTP Request, injeta a sessão de banco de dados (`Depends(get_db)`), repassa argumentos pro *Service* e devolve a `success_response()`. **Proibida qualquer lógica "if/else" de negócio aqui.**
2. **Service (`services.py`):** Coração da validação e regra. Orquestra a verificação, consulta o repositório, aplica travas de concorrência e devolve os objetos tratados (ou `BusinessException`).
3. **Repository (`repositories.py`):** Apenas faz I/O com o PostgreSQL através do SQLAlchemy.
4. **Banco (PostgreSQL):** Base relacional com payloads JSONB, Hashes granulares e metadados operacionais.

## 2. Fluxo da Sincronização Orquestrada (Cron)

Esse é um fluxo autônomo e altamente resiliente orquestrado pela classe `SincronizacaoService`:

1. **Gatilho e Trava Inteligente (Cron):** O `job_sincronizacao` roda a cada 2 horas buscando trabalhos incompletos.
   - Avalia a tabela `sync_executions`: Já rodei o *Bootstrap* completo na vida? Se não, executa.
   - Se já rodei, avalia a mesma tabela: Já fechei um *Incremental* **hoje** perfeitamente? Se sim, morre o processamento. Se não, executa *Incremental* focado apenas em contratos ativos.
2. **Fetch API Base:** Um cliente assíncrono `Httpx` bate no Comprasnet e baixa a listagem de todos os contratos em uma única tacada e pagina os resultados em lotes na memória.
3. **Checkpointing e Iteração Lógica:**
   - Varre o lote X. Ao final, marca na base `last_page_processed = X`. Em crashes sistêmicos, recupera exatamente deste valor sem desperdiçar lotes já consolidados.
   - Trata Hashes Principais. Se houver divergência, atualiza banco.
4. **Enriquecimento Secundário e Rate Limiting:**
   - Para os ativos do lote, aciona iterativamente os endpoints de enriquecimento.
   - Embala um freio `await asyncio.sleep(self.rate_limit)` entre chamadas para não sobrecarregar o governo.
   - Se bater no endpoint de `/empenhos` e der *Timeout*, não escreve falhas na base. Mantém o JSONB antigo e seta `empenhos_status = 'failed'` (Proteção de dados visuais).

## 3. Fluxo de Sincronização Manual Sob Demanda (Refresh)

Em caso de defasagem detectada por um gestor visualizando o dashboard, há o fluxo de "Sincronização Sob Demanda" (Endpoints `POST /refresh`).

1. Request bate no FastAPI pedindo o refresh de um `external_id` X.
2. O SincronizacaoService identifica a requisição, e evoca `_sync_locks[external_id]`, montando um cadeado com a biblioteca `asyncio.Lock`. Se 5 requisições chegarem ao mesmo tempo pro ID X, 4 aguardam congeladas e não espancam a API do governo nem criam "race conditions" no BD.
3. Executa a extração pontual, grava na base caso o Hash divirja, e libera o lock. Tudo fora do fluxo dos grandes arrays de Cron.

## 4. Fluxo Futuro: Motor de Análise

1. O *Analysis Engine* buscará no banco local os contratos cujos *hashes* foram alterados nos últimos processamentos.
2. Aplicará as métricas configuradas em código.
3. Se gerar inconsistência, persistirá no banco em `Alertas`.

## 5. Fluxo de Alertas e Notificações (Lifecycle)

A criação de alertas passará pelos status de persistência:
- `active`: Inconsistência identificada pela Analysis Engine.
- `viewed`: Reconhecido via dashboard pelo usuário.
- `resolved`: Corrigido automaticamente pela repactuação do dado governamental na próxima sincronização (sem mão humana).
- `dismissed`: Descartado humanamente com obrigatória criação de log na tabela `alert_history`.
