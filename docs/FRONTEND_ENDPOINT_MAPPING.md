# Mapeamento de Endpoints para Frontend (v1.0.0)

Este documento centraliza a lista de endpoints disponíveis no backend para consumo do frontend, garantindo que o dashboard seja um "Pure Renderer".

## 1. Módulo: Alertas
Base URL: `/api/v1/alertas`

| Método | Endpoint | Descrição | Parâmetros (Query/Body) |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Lista alertas ativos | `status`, `severity`, `category`, `page`, `limit`, `search` |
| `GET` | `/stats` | KPIs para Cockpit | N/A |
| `POST` | `/{id}/view` | Marca alerta como visto | N/A |
| `POST` | `/{id}/dismiss` | Dispensa alerta | `{ "reason": "texto" }` |

## 2. Módulo: Contratos (Contract 360)
Base URL: `/api/v1/contracts`

| Método | Endpoint | Descrição | Parâmetros |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Lista contratos (paginado) | `status`, `instrument_kind`, `search`, `page`, `limit`, … |
| `GET` | `/{id}` | Payload consolidado 360 | N/A |

## 3. Módulo: Sincronização
Base URL: `/api/v1/sync`

| Método | Endpoint | Descrição | Parâmetros |
| :--- | :--- | :--- | :--- |
| `POST` | `/trigger` | Dispara sync manual | `{ "contract_id": "uuid" }` |
| `GET` | `/status` | Status do worker global | N/A |

## 4. Módulo: Dashboard
Base URL: `/api/v1/dashboard`

| Método | Endpoint | Descrição | Parâmetros |
| :--- | :--- | :--- | :--- |
| `GET` | `/summary` | Dados para cards de topo | N/A |
| `GET` | `/charts` | Dados para gráficos | `range` (7d, 30d) |
