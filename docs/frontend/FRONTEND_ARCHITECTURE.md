# Frontend Architecture Documentation

## 1. Visão Geral da Estrutura (Frontend)
O frontend foi desenvolvido com React (presumivelmente via Vite, dadas as importações e variáveis de ambiente como `import.meta.env`) e utiliza uma arquitetura baseada em componentes funcionais e hooks. A estilização é feita com Tailwind CSS (e possivelmente componentes da biblioteca shadcn/ui em `components/ui`).

A navegação é gerenciada via `react-router-dom` a partir do `App.jsx`.

### 1.1. Organização de Diretórios
- `/frontend/pages/`: Contém as páginas principais do sistema (ExecutiveCockpit, Contract360, ContractsOperations, RiskCenter, AlertCenter).
- `/frontend/components/`: Subdividido por contexto ou domínio:
  - `cockpit/`: Componentes específicos do painel executivo.
  - `contract/`: Componentes relacionados aos detalhes de um contrato (abas do Contract360).
  - `layout/`: Componentes estruturais (AppLayout, Navbar/Sidebar).
  - `risk/`: Componentes do centro de risco.
  - `shared/`: Componentes reutilizáveis (KPICard, StatusBadge, RiskScoreBar, DataLoadingState).
  - `ui/`: Componentes base de interface (provavelmente gerados pelo shadcn/ui).
- `/frontend/lib/`: Contém os contextos globais e utilitários vitais:
  - `DataContext.jsx`: Centraliza a busca e distribuição dos dados principais (contratos, alertas, estatísticas).
  - `AuthContext.jsx`: Gerenciamento de autenticação.
  - `ThemeContext.jsx`: Controle de tema (light/dark).
  - `contractUtils.js`: Lógica de negócio, cálculos de prazo, status e risco.
  - `mockData.js`: Dados estáticos/temporários.
- `/frontend/utils/`: Utilitários adicionais, principalmente cálculos financeiros e de contratos (`contract.js`, `money.js`).

---

## 2. Fluxos Principais (Pages)

### 2.1. ExecutiveCockpit (`/`)
- **Objetivo:** Painel executivo ultra-compacto para sinalização rápida e priorização.
- **Componentes Base:** KPICards, ActionRequired, InsightCards, ContractsByUnit, ExpirationTimeline.
- **Filosofia Visual:** Escaneabilidade imediata. Remove descrições longas e metadados operacionais, focando na tríade: Identificação, Objeto e Prazo/Urgência.
- **Acoplamento de Dados:** Consome o payload enriquecido de `/api/v1/dashboard/stats`, que já entrega objetos de contrato e dias restantes calculados pelo backend.

### 2.2. ContractsOperations (`/contracts`)
- **Objetivo:** Tabela analítica e visualização Kanban de todos os contratos.
- **Mecanismos Internos:** 
  - Filtros cliente-side (por texto, status, criticidade, categoria).
  - Ordenação dinâmica no cliente (por risco, vencimento, etc).
  - Alternância de visualização (Tabela vs. Kanban).
- **Acoplamento:** Totalmente dependente do array massivo de `contracts` disponível via `useData()`.

### 2.3. Contract360 (`/contract/:id`)
- **Objetivo:** Visão detalhada e holística de um contrato específico.
- **Mecanismos Internos:**
  - Carrega um `contractDetail` separadamente via fetch (`/api/contracts/${id}`).
  - Mescla o detalhe com o objeto resumo vindo do `DataContext` (`const contractFinal = { ...contract, ...contractDetail };`).
  - Dividido em Abas (Visão Geral, Histórico, Empenhos, Faturas, Responsáveis, Garantia, Itens, Riscos, Aditivos, Ações).
- **Subcomponentes vitais:** `ContractFinancial`, `ContractInvoices`, `ContractResponsibles`, etc.

### 2.4. RiskCenter (`/risk-center`)
- **Objetivo:** Avaliação e matriz de criticidade do portfólio.
- **Componentes Base:** KPICards de Risco, RiskMatrix, CriticalRanking, RiskHeatMap.
- **Acoplamento:** Calcula `avgRisk` e `highRisk` em tempo real iterando sobre os contratos vindos de `useData()`.

### 2.5. AlertCenter (`/alerts`)
- **Objetivo:** Central operacional de investigação e governança.
- **Mecanismos Internos:**
  - Consome o endpoint `/api/v1/alertas` com suporte a busca textual e filtros avançados.
  - Exibe o detalhamento completo: recomendações, fontes, analisadores e timestamps.
  - Gerencia o ciclo de vida: Marcar como Visto (Viewed) e Dispensar (Dismissed).
- **UX:** Foco em produtividade e resolução de problemas técnicos/contratuais identificados pela Engine.

---

## 3. Camada de Serviços (Services)

Introduzida para isolar a comunicação com a API do backend:
- `alertasService.js`: Gerencia chamadas para `/api/v1/alertas`, incluindo estatísticas, listagem, reconhecimento (`view`) e dispensa (`dismiss`).

## 4. Estado Global e Fetching (React Query)

A aplicação está transicionando do `DataContext` (fetch gigante no mount) para o **React Query**:
- **Granularidade:** Cada componente ou página pode buscar seus dados específicos de forma assíncrona.
- **Caching & Retry:** Utiliza as capacidades nativas do `@tanstack/react-query` para gerenciar estados de loading, erro e re-sincronização automática.
- **Consistência:** O backend é o SSOT. O frontend mapeia os ENUMs do backend para classes visuais (Tailwind) sem aplicar lógica de negócio.

---

## 5. Mapeamento de Regras (Frontend como Renderer)

- **Severidades:** O mapeamento de enums (`critical`, `high`, `medium`, `low`) para cores (`red`, `orange`, `yellow`, `green`) é centralizado em `contractUtils.js`.
- **Status:** O ciclo de vida dos alertas (`active`, `viewed`, `resolved`) é gerenciado pelo backend. O frontend apenas reflete o estado atual.

---

## 6. Mocks e Estruturas Temporárias Identificadas
1. **Eventos e Aditivos no `DataContext`:**
   - As variáveis de estado `events` e `amendments` são inicializadas como arrays vazios e referenciadas como "ainda mock (depois fazemos)" nos comentários do `DataContext.jsx`.
2. **Dados fakes injetados:**
   - Há um arquivo `lib/mockData.js` extenso com estruturas de testes.
3. **URL Hardcoded de Fetch:**
   - Em `DataContext.jsx`, há `const API = "https://solid-space-funicular-qx5xr6qvw56h4476-8000.app.github.dev"`. O `.env` é fracamente suportado neste trecho e falha ao apontar diretamente para uma string fixa.
   - Em `Contract360.jsx`, utiliza-se `const API = import.meta.env.VITE_API_URL || "..."` (uma abordagem um pouco melhor, mas ainda contém a string fixa de fallback).
4. **Merge do Client-Side (`Contract360.jsx`):**
   - O contrato é mesclado grosseiramente `const contractFinal = { ...contract, ...contractDetail };`, o que significa que o detalhe não retorna propriedades redundantes ou elas sobrescrevem a lista global.

---

## 6. O que deve permanecer e o que deve migrar

### Permanecer no Frontend (Visual / UX)
- A lógica de componentes de renderização (cores hex/Tailwind baseados no enum que retornar da API).
- Configurações de dicionários de cores (`getSeverityColor`, `getCriticalityConfig` apenas mapeando enums do backend para classes CSS).
- Interatividade de interface (Tabs, estados de modais, visões Kanban vs Tabela).

### Migrar para o Backend FastAPI (Regras de Negócio e Processamento)
- **Cálculo de Estatísticas:** A função `buildStats` do frontend deve sumir. O backend deve entregar o `/api/dashboard/stats` já calculado (expiring30, expiring60, redAlerts, totalValue, etc).
- **Filtros e Buscas (`ContractsOperations.jsx`):** O frontend não pode mais iterar e filtrar o array inteiro na RAM do usuário, especialmente quando o número de contratos crescer. O backend precisa entregar um endpoint de listagem paginado/filtrável (`/api/contracts?status=X&q=Y&sort=Z`).
- **Normalização de Status:** A string `ativo_com_execucao_no_ano` não deve existir se o nome oficial é `ativo_operacional`. O backend deve entregar a string final normalizada.
- **Indicadores de Prazo:** O frontend não deve calcular os "Dias Restantes" usando `Date` javascript, devido a problemas de timezone. O backend deve calcular o `days_remaining` na hora do request ou em jobs diários.
