# Sincronização Resiliente e Cobertura Garantida

A sincronização de contratos e seus domínios não foca em cálculos, ela foca puramente em varrer e garantir **cobertura total**. Para que a instabilidade da API do governo não cause perda de informações ou timeouts fatais em nossa base de mais de 1200 itens, as seguintes diretrizes formam a "Bíblia" do motor de sincronização:

## 1. Paginação Lógica (Chunks) e Checkpoints
Como a API externa não possui paginação parametrizável e devolve toda a base de uma vez, nosso sistema consome esse payload único gigantesco na memória e imediatamente o subdivide em "lotes lógicos" (ex: lotes de 50).
* A tabela `sync_executions` registra uma linha para toda rodada do orquestrador.
* Após processar o lote X, o SQLAlchemy atualiza a coluna `last_page_processed = X`.
* Em caso de quebra abrupta, o script retoma exatamente onde parou pulando as páginas já anotadas, blindando o processamento.

## 2. Modes: Bootstrap e Incremental
O `jobs.py` agora possui uma mente coordenadora (`Orquestrador`):
- **Bootstrap (Prioridade Absoluta):** Funciona como uma varredura exaustiva inicial. Enquanto não atingir o último lote com status `completed`, ele será reiniciado automaticamente (Retries contínuos de 2 em 2 horas).
- **Incremental (Rotina Leve Diária):** Acionado apenas após o Bootstrap na vida útil da plataforma. Se rodar com sucesso (`completed`), uma trava impede que ele rode novamente naquele dia. Se falhar no meio, a trava diária não aciona, e ele repete agressivamente até concluir 100% dos contratos ativos.

## 3. Rate Limiting Controlado
O estresse de I/O de rede é minimizado por um atraso intencional inserido em código. 
Dentro da iteração dos secundários, roda-se: `await asyncio.sleep(self.rate_limit)`.
* Isso impede de tomarmos bloqueio de IP. 
* O valor de repouso é customizável pela variável global no `.env` `SYNC_RATE_LIMIT`.

## 4. Integração com Analysis Engine

Toda vez que uma sincronização (Bootstrap ou Incremental) altera o estado de um contrato, o campo `last_operational_update_at` é atualizado. O Job da **Analysis Engine** monitora este campo para disparar o reprocessamento analítico de forma desacoplada, garantindo que os alertas estejam sempre sincronizados com os dados mais recentes do Comprasnet.

## 5. Segurança do Payload e Quedas de Endpoints Secundários
Se um contrato bater para pedir "Empenhos" e a rede acusar falha, HTTPStatusError (502, 504) ou RequestError:
* É **terminantemente proibido** salvar um dict/array vazio no banco por conta desse erro.
* Nossa inteligência age de forma conservadora mantendo o `raw_empenhos` do jeito que estava (preservação JSONB) e atualiza exclusivamente a coluna de controle do status de endpoint: `empenhos_status = 'failed'`, e a data da falha em `last_failed_sync_at`.
* A próxima rodada tentará recalcular. A falha de sincronização NÃO pode corromper análises retrospectivas em dashboards visuais de gerência.

## 6. Sincronização Sob Demanda (Manual) com Lock
Criamos rotas manuais acessíveis via endpoints:
* **Problema:** Um gerente no dashboard clica no botão "Refazer sincronia de faturas agora", ele acerta na hora errada, o cron job rodava junto ou o gerente clica 10 vezes em pânico.
* **Solução - asyncio.Lock:** O `SincronizacaoService` cria um bloqueio de estado atrelado unicamente ao ID que está pedindo (através de dicionário de memória `_sync_locks`). Múltiplos requests pelo mesmo contrato são enfileirados, protegidos de concorrência. Não afeta a fluidez da checagem em CRON, que navega em blocos paralelos.

## 6. Lógica dos Hashes de Domínio (Reiterada)
Todo pedaço consumido sofre o crivo do hash `SHA-256`. 
São 7 pedaços: o contrato em si (`main_hash`) e seus 6 complementos secundários (`empenhos_hash`, `faturas_hash`...). Só é autorizada a operação destrutiva de salvar em banco se o hash divergir matematicamente entre a base externa e a base relacional PostgreSQL.
