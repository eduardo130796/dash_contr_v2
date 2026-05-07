# Arquitetura do Sistema

Documento que define os padrões arquiteturais obrigatórios para a Plataforma de Gestão Contratual.

A plataforma foca na importação robusta, tratamento escalável e geração estruturada de inteligência sobre contratos e seus domínios (empenhos, faturas, responsáveis, itens, etc) extraídos da API Comprasnet.

## 1. Topologia de Banco de Dados (PostgreSQL + Supabase)

Diferente de sistemas legados que espelham perfeitamente árvores complexas de endpoints REST em um schema relacional monstruoso, nós adotamos a abordagem do **Dado Cru Garantido (JSONB)**:
* Colunas normais servem apenas para: Índices vitais (`external_id`), rastreadores de estado (`status`, `is_active`, `empenhos_status`) e assinaturas temporais.
* Os dados brutos das faturas, itens e empenhos habitam inteiramente e imutavelmente suas próprias colunas `JSONB` no model Contratos.

Se a API do governo adicionar um campo novo no array de faturas amanhã, nosso sistema não precisará rodar uma migration complexa para começar a salvar; o pacote JSONB ingere passivamente.

## 2. Princípios Imutáveis de Código

* **Router Burro:** O controlador de HTTP não processa negócios. Todo o crivo é do `Service`.
* **Proteção Mútua de Concorrência:** Sincronizações assíncronas geram conflitos no banco se disparadas freneticamente no mesmo registro. Todo evento que busca atualizar um registro ativamente sob demanda usa travas de `asyncio.Lock` em memória por ID do contrato.
* **Blindagem de Falhas (Obrigatório):** Erro de Timeout com o Comprasnet não é novidade, é regra. Se uma API de enriquecimento falhar ao entregar um JSON novo, o sistema **proíbe a substituição** do JSON velho. Ele atualiza apenas o tracker de saúde (ex: `faturas_status = 'failed'`). Isso não estilhaça nenhum dashboard.

## 3. Arquitetura da Sincronização

A sincronização se divide arquiteturalmente em duas mentes operacionais:
1. **O Orquestrador (Scheduler)**
   * Trabalha sobre a tabela `sync_executions`.
   * Realiza `Bootstrap` (cobertura incansável e bruta a cada 2 horas) salvando Checkpoints lógicos até cravar que todo o array inicial da UG (Unidade Gestora) desceu corretamente.
   * Realiza `Incremental` (cobertura elegante diária) apenas analisando contratos marcados como "ativos".
2. **O Roteador On-Demand**
   * Usado para botões de "Forçar Atualização" no painel visual. Funciona com exata paridade à lógica do Orquestrador, aproveitando os cálculos de hash, porém voltado a apenas um contrato sem interferir nos *checkpoints*.

## 4. O Rate Limit Nativo

Não podemos sobrecarregar a infraestrutura alheia. Todas as sequências de consumo massivo de endpoits (quando se itera pelos 6 secundários de um contrato) contêm delays programáticos via `asyncio.sleep()`, importado dinamicamente via `.env` (`SYNC_RATE_LIMIT`), propiciando "friendly consumption".

## 5. Próxima Fronteira: Motor de Análise
É formalmente proibido acoplar regras de alertas no módulo Sincronizador. A importação de dados e a análise destes não se tocam diretamente.
* O motor de Análise (A ser desenvolvido) roda de forma cega em cima da massa SQL local que o Sincronizador consolidou (os dados no JSONB).
* Os Alertas gerados são gravados de forma perene no PostgreSQL (`active`, `resolved`), e não computados em tempo real na tela do frontend. O frontend será burro e apenas lerá `SELECT * FROM alertas`.

Qualquer refatoração deve obedecer a estas 5 diretrizes, sob pena de perda drástica de performance ou regressão analítica.
