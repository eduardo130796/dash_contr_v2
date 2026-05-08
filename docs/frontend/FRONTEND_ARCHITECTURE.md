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
- **Objetivo:** Painel de alto nível para a gestão executiva.
- **Componentes Base:** KPICards, ExpirationChart, CriticalityDistribution, ActionRequired, InsightCards, ContractsByUnit, ExpirationTimeline.
- **Acoplamento de Dados:** Consome `useData()` e exibe `stats` calculados no cliente em tempo real, baseando-se no array de `contracts` e `alerts`.

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
- **Objetivo:** Central de notificações operacionais e financeiras.
- **Acoplamento:** Consome a lista de `alerts` do `DataContext`.

---

## 3. Dependências e Contextos (Contexts & Hooks)

O coração do estado do frontend atual é o `DataContext.jsx`:
- **Estado Global:** Mantém `contracts`, `alerts`, `events` (mock), `amendments` (mock).
- **Memoization:** Usa `useMemo` para recalcular as estatísticas (`stats`) globais sempre que `contracts` ou `alerts` mudam, através da função `buildStats()`.
- **Fetching centralizado:** Faz um único fetch gigante para `/api/dashboard` durante o mount da aplicação. Isso injeta todos os dados no cliente.

---

## 4. Lógica de Negócio Encontrada no Frontend (A MIGRAR/COMPARTILHAR)
Muitas regras de negócio vitais estão implementadas estritamente do lado cliente, o que representa um acoplamento perigoso se outros clientes consumirem a API.

- **Status & Normalização (`lib/contractUtils.js`):**
  - A função `normalizeStatus` mapeia `ativo_com_execucao_no_ano` -> `ativo_operacional` e `vencido_com_execucao_no_ano` -> `vencido_com_execucao_recente`. O frontend faz a adaptação da nomenclatura.
- **Cálculos de Criticidade e Risco (`lib/contractUtils.js` e `RiskCenter.jsx`):**
  - Definição visual baseada em ranges de risco (ex: `>= 75` é vermelho, `< 30` é verde).
  - Cálculo de Média de Risco em `RiskCenter.jsx` (`avgRisk = sum(risk_score) / length`).
- **Cálculos Temporais (`lib/contractUtils.js`):**
  - `getDaysRemaining` para saber dias até o término.
  - Agrupamento de vencimentos (em 30, 60, 90, 180 dias) dentro de `buildStats` em `DataContext`.
- **Estatísticas Agregadas (`DataContext.jsx - buildStats`):**
  - Cálculo total de valor de portfólio via `.reduce`.
  - Filtro para contratos não expirados/suspensos.
  - Filtro para encontrar contratos `strategic`, `urgent`, `critical`.
- **Busca, Filtragem e Ordenação (`ContractsOperations.jsx`):**
  - O filtro e a busca (`search`, `statusFilter`, `criticalityFilter`, `categoryFilter`) bem como a ordenação (`sortField`, `sortDir`) ocorrem 100% no navegador via JavaScript.

---

## 5. Mocks e Estruturas Temporárias Identificadas
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
