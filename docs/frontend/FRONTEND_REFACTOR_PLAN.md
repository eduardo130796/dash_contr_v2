# Plano de Refatoração do Frontend (Transição para FastAPI)

Este documento descreve a estratégia segura para migrar a fonte de dados do frontend React para o novo backend FastAPI modular, garantindo que **a UX, a navegação e a identidade visual permaneçam rigorosamente intactas**.

A refatoração será puramente técnica, focada nas camadas de dados (Network, State Management e Business Logic).

## Fase 1: Desacoplamento da Lógica de Negócios (Backend)

Antes de tocar nos componentes React, o backend precisa assumir suas responsabilidades.

1. **Implementar Endpoint de Dashboard (`/api/v1/dashboard/stats`):**
   - Deve assumir a lógica atualmente presente em `lib/DataContext.jsx` (`buildStats()`).
   - Deve calcular totais financeiros, contratos críticos, urgentes e agrupar vencimentos em 30/60/90 dias.

2. **Implementar Endpoint de Listagem (`/api/v1/contracts`):**
   - Assumir a normalização de status (ex: `ativo_com_execucao_no_ano` -> `ativo_operacional`).
   - Assumir o cálculo de `days_remaining` (substituindo a função `getDaysRemaining` do `contractUtils.js`).
   - Criar suporte a paginação e queries estritas (search, status, criticality).

## Fase 2: Construção da Camada de Integração (Frontend)

O frontend atual faz chamadas `fetch` genéricas espalhadas pelos arquivos. Devemos centralizar isso.

1. **Criar a pasta `/frontend/services/`:**
   - `api.js`: Instância configurada do axios/fetch, centralizando a Base URL do FastAPI e credenciais.
   - `dashboardService.js`: Encapsular a chamada do cockpit.
   - `contractService.js`: Encapsular chamadas de paginação e visão 360.
   
2. **Setup de Cache/State:**
   - O projeto já possui o `@tanstack/react-query` importado no `App.jsx`. O refatoramento deve adotá-lo massivamente para substituir o `useState` acoplado ao `useEffect` dentro dos contextos.

## Fase 3: Esvaziamento do `DataContext.jsx`

Atualmente, `DataContext` baixa todos os contratos e repassa para todas as telas. Isso deve ser erradicado.

1. Substituir a carga massiva pelo fetch apenas dos KPIs (`/api/v1/dashboard/stats`).
2. Páginas como `ExecutiveCockpit` passam a consumir apenas esses dados rasos do contexto.
3. Mocks temporários (`events`, `amendments`) contidos lá devem ser removidos e delegados ao respectivo endpoint.

## Fase 4: Refatoração Limpa das Páginas (Sem alterar UI)

### 4.1. `ContractsOperations.jsx`
- **Problema atual:** Faz `.filter()` e `.sort()` client-side em um array injetado pelo Context.
- **Ação:** Remover a ingestão do `useData()` para contratos. Usar `useQuery` (do React Query) para chamar a API passando o estado local de filtros (`search`, `statusFilter`, `page`, etc) como gatilhos de re-fetch.
- **UI:** A tabela e as cores continuam idênticas, mas os dados vêm do servidor página a página.

### 4.2. `Contract360.jsx`
- **Problema atual:** Une um "contrato base" do Contexto Global com o "detalhe" vindo de um Fetch.
- **Ação:** Chamar `/api/v1/contracts/{id}` via `useQuery`. O backend deve entregar o objeto completo de forma independente. O layout das abas (`TabsContent`) apenas consome os novos nós unificados do JSON.

### 4.3. `RiskCenter.jsx`
- **Problema atual:** Itera sobre a lista de contratos para achar `avgRisk` e `highRisk`.
- **Ação:** Esses dois KPIs devem ser trazidos via endpoint de stats do Dashboard, eliminando a iteração client-side. O mapa de calor pode consumir uma query específica.

## Fase 5: Limpeza do Código

1. **`lib/contractUtils.js`:** 
   - Remover as funções `buildStats`, `normalizeStatus` e `getDaysRemaining`.
   - Manter as funções visuais: `getSeverityColor`, `getSeverityBg`, `getCriticalityConfig`, `getStatusConfig` (já que lidam com conversão de enumeração para classes do Tailwind CSS).
2. **`mockData.js`:**
   - Excluir o arquivo com dados fictícios.
3. **Limpeza de variáveis de ambiente:**
   - Apagar fallback hardcoded como `https://solid-space-funicular-qx5xr6qvw56h4476-8000.app.github.dev` do `DataContext.jsx` e forçar o uso correto do `import.meta.env.VITE_API_URL`.

---
**Nota Crítica de Execução:** Nenhuma dessas alterações modifica arquivos dentro de `components/ui` ou subcomponentes visuais dentro de `components/shared`. A UX permanece inviolada.
