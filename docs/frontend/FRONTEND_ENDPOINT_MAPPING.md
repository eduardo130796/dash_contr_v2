# Mapeamento de Endpoints Frontend

Este documento descreve o mapeamento entre as telas do frontend e os endpoints do backend FastAPI, padronizando o consumo de dados.

## 1. ExecutiveCockpit (Dashboard Principal)

- **Endpoint:** `GET /api/v1/dashboard/stats`
- **Componentes:**
  - `SummaryCards.jsx`: Consome `total_active`, `total_value`, `critical_alerts`, `average_risk`.
  - `RiskDistributionChart.jsx`: Consome `risk_distribution` (high, medium, low).
  - `CategoryBreakdown.jsx`: Consome `category_stats`.
  - `UpcomingRenewals.jsx`: Consome `upcoming_renewals`.

## 2. ContractsOperations (Listagem Operacional)

- **Endpoint:** `GET /api/v1/contracts`
- **Query Params:**
  - `page`: Paginação.
  - `limit`: Itens por página.
  - `search`: Busca textual (número, objeto, fornecedor).
  - `status`: Filtro de situação (`ativo`, `vencendo`, `vencido`, `suspenso`, `encerrado`).
  - `criticality`: Filtro de criticidade (`low`, `attention`, `high`, `critical`).
  - `category`: Filtro de categoria.
  - `sort_by`: Campo de ordenação.
  - `order`: `asc` | `desc`.
- **Comportamento Default:** Retorna apenas contratos `ativo`.
- **Mapping:**
  - `ContractListItem` ↔ `items` no payload.

## 3. Contract360 (Visão Analítica Detalhada)

- **Endpoint:** `GET /api/v1/contracts/{id}`
- **Payload:** `Contrato360Response`
- **Mapping por Aba:**
  - **Geral (Overview):** `resumo`, `riscos`, `alertas`.
  - **Timeline:** `timeline`.
  - **Financeiro:** `financeiro`.
  - **Itens:** `execucao.itens`.
  - **Responsáveis:** `responsaveis`.
  - **Garantias:** `garantias`.
  - **Aditivos:** `aditivos`.

## 4. Sincronização (Manutenção)

- **Endpoint:** `POST /api/v1/sync/bootstrap` (Carga inicial)
- **Endpoint:** `POST /api/v1/sync/incremental` (Atualização diária)
- **Endpoint:** `POST /api/v1/sync/contract/{external_id}/refresh` (Refresh manual de um contrato)

## 5. Padronização de Dados (Frontend Renderer)

| Tipo de Dado | Padrão Backend | Formatação Frontend | Util (formatters.js) |
| :--- | :--- | :--- | :--- |
| **Data** | ISO 8601 (`YYYY-MM-DD`) | `DD/MM/YYYY` | `formatarDataBR()` |
| **Data/Hora** | ISO 8601 | `DD/MM/YY HH:mm` | `formatarDataHoraBR()` |
| **Moeda** | `float` | `R$ 0,00` | `formatarMoedaBR()` |
| **Status** | `string` (lowercase) | Label amigável | `getStatusLabel()` |
| **Percentual** | `float` (0-100) | `0,0%` | `formatarDecimalBR(val, 1)` |

## 6. SSOT (Single Source of Truth)

Toda lógica de negócio, inclusive a derivação de `situacao_real` e o cálculo de `dias_restantes`, é responsabilidade do **Backend**. O Frontend atua estritamente como um renderizador dos dados entregues pela API.
