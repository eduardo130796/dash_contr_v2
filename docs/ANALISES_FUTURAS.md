# Planejamento de Análises Futuras (Roadmap)

A Analysis Engine v1 estabelece a base para expansões analíticas avançadas. Abaixo estão os tópicos previstos para as próximas iterações.

## 1. Score de Risco (Risk Scoring)
- Atribuir um valor numérico (0-100) para cada contrato baseado na criticidade dos alertas ativos.
- Agregação por Unidade Gestora ou Categoria de Contrato.

## 2. Análise Financeira Avançada
- **Desvio de Empenho**: Alerta se o saldo empenhado for insuficiente para a média de faturamento.
- **Glosa Crítica**: Detecção de padrões de glosas recorrentes acima de um percentual configurável.
- **Reajuste/Repactuação**: Alerta proativo baseado em índices de inflação (IPCA/IGP-M) e data de aniversário.

## 3. Inteligência Artificial (AI Engine)
- **Análise Preditiva de Vencimento**: Previsão de atrasos baseada no histórico de tramitação.
- **Detecção de Anomalias**: Identificação de faturas fora do padrão estatístico do contrato.
- **Assistente de Resolução**: Sugestões de ações baseadas em casos similares resolvidos anteriormente.

## 4. Integração de Canais (WhatsApp/E-mail)
- Disparo automático de notificações para alertas `critical` ou `immediate`.
- Resumos semanais consolidados por gestor.

## 5. Multi-tenant e Governança
- Filtros por região, secretaria ou órgão.
- Controle de acesso granular por categoria de alerta.
