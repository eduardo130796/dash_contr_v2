# Arquitetura da Plataforma

Este documento descreve a organização modular e as diretrizes arquiteturais do projeto.

## 1. Princípios Fundamentais

- **Backend como SSOT (Single Source of Truth)**: Toda a lógica de negócio, cálculos e avaliações residem no backend.
- **Frontend como Pure Renderer**: O frontend é responsável apenas por renderizar os dados fornecidos pela API, sem aplicar lógicas de negócio complexas.
- **Arquitetura Modular**: Cada domínio de negócio possui seu próprio módulo no diretório `backend/modules`.
- **Desacoplamento Analítico**: A ingestão de dados (Sincronização) é separada da inteligência de dados (Analysis Engine).

## 2. Estrutura de Módulos

### `contratos`
Gerencia o domínio principal de contratos, agregando múltiplos payloads governamentais em uma visão consolidada (Contract 360).

### `sincronizacao`
Responsável pela comunicação com a API do Comprasnet, controle de hashes e persistência de dados brutos (`raw_*`).

### `analise`
O **Motor de Análise** (Analysis Engine). Processa contratos incrementalmente e gera `AlertCandidates`. Opera via Jobs agendados.

### `alertas`
Gerencia o ciclo de vida dos alertas persistentes, garantindo idempotência e fornecendo endpoints para o AlertCenter e Cockpit.

### `auditoria`
Registra todo o histórico de alterações críticas no sistema, especialmente mudanças no lifecycle de alertas.

## 3. Fluxo de Dados e Inteligência

1. **Sincronização**: Ingestão de dados brutos e atualização de hashes.
2. **Notificação de Mudança**: O campo `last_operational_update_at` é atualizado.
3. **Analysis Engine**: O Job identifica contratos alterados, executa analisadores e propõe alertas.
4. **Persistência de Alertas**: O módulo de alertas valida a idempotência (fingerprint) e persiste novos alertas ou resolve os antigos.
5. **Consumo**: O frontend consome os dados consolidados através de endpoints otimizados.
