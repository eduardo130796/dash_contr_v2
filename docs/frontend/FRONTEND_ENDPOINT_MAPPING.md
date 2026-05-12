# Mapeamento de Endpoints Frontend

Este documento descreve o mapeamento entre as telas do frontend e os endpoints do backend FastAPI, padronizando o consumo de dados.

## 1. ExecutiveCockpit (Dashboard Principal)

- **Endpoint Unificado:** `GET /api/v1/dashboard/stats`
- **Payload Enriquecido:** Entrega KPIs, Alertas Urgentes, Insights e Timeline em um único roundtrip.
- **KPIs `kpis`:** `totalActive` = apenas instrumentos com `raw_contract.tipo` = **contrato** no portfólio executivo; `activeEmpenhos` e `activeAtas` contam empenhos/atas com o mesmo critério de portfólio (ver `docs/REGRAS_NEGOCIO.md`).
- **Campos Adicionais:** `contract_object`, `days_remaining` (calculados no backend).
- **Componentes:**
  - `KPICard`: Consome `kpis`.
  - `ActionRequired.jsx`: Consome `urgent_actions`.
  - `InsightCards.jsx`: Consome `executive_insights`.
  - `ExpirationTimeline.jsx`: Consome `expiration_timeline`.

## 2. Central de Alertas (AlertCenter)

- **Endpoint:** `GET /api/v1/alertas`
- **Query Params:**
  - `status`: `active`, `viewed`, `resolved`, `dismissed`.
  - `severity`: `critical`, `high`, `medium`, `low`, `info`.
  - `category`: `vigencia`, `sincronizacao`, `compliance`, `cadastro`.
  - `search`: Busca textual (número, título, mensagem).
- **Ações:**
  - `POST /api/v1/alertas/{id}/view`: Reconhecer alerta (muda status para `viewed`).
  - `POST /api/v1/alertas/{id}/dismiss`: Dispensar alerta com justificativa.

## 3. ContractsOperations (Listagem Operacional)

- **Endpoint:** `GET /api/v1/contracts`
- **Query Params:**
  - `page`: Paginação.
  - `limit`: Itens por página.
  - `search`: Busca textual (número, objeto, fornecedor).
  - `instrument_kind`: `contrato` (padrão, alinhado ao Painel Executivo), `empenho`, `ata`, `all`.
  - `status`: omitido = **portfólio executivo** (mesma lógica de `ativo_rules` no backend, paridade com `GET /dashboard/stats`); `all` = sem filtro de situação na coluna; ou um valor explícito (`ativo`, `vencendo`, etc.).
  - `criticality`: Filtro de criticidade (`low`, `attention`, `high`, `critical`).
  - `category`: Filtro de categoria.
  - `sort_by`: Campo de ordenação.
  - `order`: `asc` | `desc`.
- **Comportamento default:** `instrument_kind=contrato` e `status` omitido reproduzem o escopo do card **Contratos Ativos** do cockpit.
- **`portfolio_composition`:** quando `instrument_kind=all`, a resposta inclui agregação dinâmica `{ normalized_tipo, count }[]` por `lower(btrim(raw_contract.tipo))`, nos **mesmos** filtros de situação/busca/criticidade/categoria — transparência do total “Todos os tipos”.
- **Mapping:**
  - `ContractListItem` ↔ `items` no payload.

## 4. Contract360 (Visão Analítica Detalhada)

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

## 5. Sincronização (Manutenção)

- **Endpoint:** `POST /api/v1/sync/bootstrap` (Carga inicial)
- **Endpoint:** `POST /api/v1/sync/incremental` (Atualização diária)
- **Endpoint:** `POST /api/v1/sync/contract/{external_id}/refresh` (Refresh manual de um contrato)

## 6. Padronização de Dados (Frontend Renderer)

| Tipo de Dado | Padrão Backend | Formatação Frontend | Util (formatters.js) |
| :--- | :--- | :--- | :--- |
| **Data** | ISO 8601 (`YYYY-MM-DD`) | `DD/MM/YYYY` | `formatarDataBR()` |
| **Data/Hora** | ISO 8601 | `DD/MM/YY HH:mm` | `formatarDataHoraBR()` |
| **Moeda** | `float` | `R$ 0,00` | `formatarMoedaBR()` |
| **Status** | `string` (lowercase) | Label amigável | `getStatusLabel()` |
| **Percentual** | `float` (0-100) | `0,0%` | `formatarDecimalBR(val, 1)` |

## 7. SSOT (Single Source of Truth)

Toda lógica de negócio, inclusive a derivação de `situacao_real` e o cálculo de `dias_restantes`, é responsabilidade do **Backend**. O Frontend atua estritamente como um renderizador dos dados entregues pela API.
