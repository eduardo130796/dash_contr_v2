# Lifecycle e Documentação de Alertas v1

O módulo de alertas é o componente central de governança da plataforma, operando como uma camada de persistência para todas as inconsistências identificadas pela **Analysis Engine**.

## 1. Arquitetura de Persistência e Idempotência

Os alertas são persistidos no banco de dados com um `fingerprint` único (SHA256) calculado a partir de:
`contract_id` + `type` + `context` (metadados normalizados).

Isso garante que:
- O mesmo problema não gere múltiplos alertas.
- Reincidências sejam rastreadas através dos campos `first_seen_at` e `last_seen_at`.
- O histórico de alterações seja preservado mesmo após a resolução.

## 2. Estrutura do Modelo e Governança

Campos principais v1:
- `fingerprint`: Identificador único de idempotência.
- `category`: [vigencia, sincronizacao, compliance, cadastro].
- `severity`: [critical, high, medium, low, info].
- `priority`: [immediate, high, normal, low].
- `source`: Origem do alerta (ex: `analysis_engine`).
- `analyzer_name`: Nome do analisador que gerou o alerta.
- `recommended_action`: Texto orientador para o gestor.

## 3. Ciclo de Vida (Status)

Todo alerta transita pelos seguintes estados:
- `active`: Identificado recentemente e pendente de ação.
- `viewed`: Visualizado pelo usuário no dashboard.
- `dismissed`: Ignorado conscientemente (requer justificativa).
- `resolved`: Resolvido automaticamente pela Engine quando a causa raiz desaparece.
- `expired`: Prazo de SLA excedido.
- `failed`: Erro no processamento ou notificação.

## 4. Resolução Automática

A Analysis Engine realiza a resolução automática:
1. Em cada rodada, ela identifica os problemas atuais.
2. Se um alerta `active` de um contrato NÃO for reportado pelo seu respectivo `analyzer`, ele é marcado como `resolved`.
3. Isso garante que o dashboard esteja sempre limpo e reflita o estado real da API governamental.

## 5. Auditoria (Alert History)

Toda mudança de status é registrada automaticamente na tabela `alert_history`, contendo:
- `alert_id`: Referência ao alerta.
- `action`: [created, viewed, dismissed, resolved, reactivated].
- `performed_by`: Usuário ou `system`.
- `details`: JSON contendo o contexto da mudança.

## 6. Endpoints Disponíveis

- `POST /api/v1/alertas/{id}/dismiss`: Dispensa com justificativa.

## 7. Estratégia de Visualização (Consumo)

A plataforma separa a profundidade operacional da visibilidade estratégica:

### ExecutiveCockpit (Priorização)
- **Foco:** Sinais de fumaça e picos de risco.
- **Payload:** Resumido via `/api/v1/dashboard/stats`.
- **Conteúdo:** Apenas identificação e urgência.

### AlertCenter (Operação)
- **Foco:** Investigação, auditoria e resolução.
- **Payload:** Detalhado via `/api/v1/alertas`.
- **Conteúdo:** Histórico completo, recomendação técnica, fonte e contexto.

### Contract360 (Análise)
- **Foco:** Visão holística do contrato.
- **Payload:** Através de `Contrato360Response`.
