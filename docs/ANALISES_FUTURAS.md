# Planejamento da Engine Analítica e Novas Funcionalidades

Este documento estabelece as diretrizes estritas que devem ser seguidas para qualquer evolução da plataforma que envolva a construção de métricas ou geração de alertas sobre inconsistências.

## 1. Separação Estrita de Responsabilidades (Sync vs Analysis)

Para manter a estabilidade do sistema, o isolamento entre **Busca de Dados (Sincronização)** e **Cálculo de Inconsistências (Engine Analítica)** é imutável:
- O `SincronizacaoService` NÃO deve jamais calcular se um contrato está sem faturas ou se um saldo estourou.
- A sincronização existe **exclusivamente** para espelhar a base externa dentro do Supabase, persistir JSONB, comparar Hashes e proteger contra quedas. Nada mais.
- A *Analysis Engine* rodará isolada, analisando a massa de dados crua validada, avaliando as regras de negócio em cima do banco local de forma super otimizada.

## 2. Fluxo Ideal de Evolução Futura

### Camada de Motor de Regras (Rule Engine)
1. Deve ser criado um novo módulo `backend/modules/analise/`.
2. As lógicas de inconsistências (ex: "Empenho emitido mas sem Nota de Empenho correspondente") devem ser implementadas como classes ou métodos puros que recebam o JSONB do contrato e retornem `True/False` ou objetos de Alerta.
3. Isso será orquestrado por um novo agendador (ex: que rode a cada poucas horas), pegando apenas os contratos que tiveram o `last_operational_update_at` alterado recentemente.

### Lifecycle e Criação de Alertas
- Se a *Engine Analítica* encontrar um problema, ela não deve interagir com rotas web.
- Ela chamará o repositório do Módulo de `alertas` para inserir o problema com status `active` na tabela de alertas, respeitando o `ALERTAS.md`.
- Na próxima rodada, se o problema houver sumido do JSONB, a engine deve marcar o alerta previamente `active` como `resolved`.

## 3. Padrões Obrigatórios para Novas Regras
- **Sem Lógica Espalhada**: Jamais coloque cálculos de inconsistência nas classes de repositório (`repositories.py`) ou rotas (`routes.py`). Tudo deve ser envelopado em classes do tipo `*Service` ou `*Analyzer`.
- **Rastreabilidade Obrigatória**: Se uma automação encerrar ou criar um evento, ela precisa logar de forma estruturada. Use sempre `structlog.get_logger()`.
- **Idempotência**: Uma regra precisa ser desenhada de tal forma que, se executada 100 vezes seguida sobre o mesmo contrato inalterado, não gere 100 alertas duplicados. Ela deve procurar se o alerta de mesma `severity` e `type` já está `active` naquele `contract_id` antes de inserir novos.
