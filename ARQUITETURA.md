# Arquitetura Contract360

Plataforma integrada de gestão e análise de contratos públicos, baseada em micro-módulos e processamento analítico assíncrono.

## 1. Princípios Arquiteturais

1.  **Backend como SSOT:** Toda a lógica de negócio, cálculos financeiros, scoring de risco e consolidação de status residem no backend.
2.  **Frontend Pure Renderer:** O frontend React é uma camada de apresentação burra que consome payloads analíticos pré-processados.
3.  **Domínio Unificado:** Nomenclatura em português para o domínio de negócio, alinhada entre as tabelas do PostgreSQL, modelos Pydantic e propriedades do Frontend.
4.  **Resiliência Baseada em Hash:** A sincronização utiliza hashes (`SHA-256`) para identificar mudanças e evitar processamento redundante.

## 2. Stack Tecnológica

-   **Backend:** FastAPI, SQLAlchemy (Async), PostgreSQL.
-   **Frontend:** React, Vite, Tailwind CSS, Shadcn/UI, React Query.
-   **Infra:** Docker, Docker Compose.

## 3. Estrutura de Domínio e Situação Real

A `situacao_real` é o campo mestre que define o estado do contrato na plataforma:
-   **Ativo:** Vigência futura e status operacional.
-   **Vencendo:** Vigência expira em menos de 30 dias.
-   **Vencido:** Data de vigência ultrapassada.
-   **Suspenso:** Interrupção temporária documentada.
-   **Encerrado:** Ciclo de vida concluído.

## 4. Fluxo de Dados (SSOT Flow)

1.  **Sincronização:** Coleta dados brutos (PNCP/Comprasnet) e armazena em JSONB.
2.  **Análise (Background):** Processa os JSONBs, calcula riscos, derivas status e gera flags.
3.  **Analytics (360):** `ContratoService` compõe a visão consolidada para o Contract 360.
4.  **Apresentação:** Frontend aplica formatadores (`formatters.js`) e renderiza os componentes.

## 5. Padronização de Exibição (Localização BR)

| Elemento | Padrão |
| :--- | :--- |
| **Datas** | `DD/MM/YYYY` (ex: 08/05/2024) |
| **Valores** | `R$ 1.234,56` |
| **Identificadores** | Formato original do contrato (ex: 123/2024) |
| **Labels** | Capitalização amigável (ex: Ativo, Vencendo) |

## 6. Governança de Documentação

-   `docs/CONTRACT360_ARCHITECTURE.md`: Detalhes técnicos da visão 360.
-   `docs/frontend/FRONTEND_ENDPOINT_MAPPING.md`: Mapa de integração API/UI.
-   `docs/REGRAS_NEGOCIO.md`: Lógica de negócio e cálculos aplicados.
