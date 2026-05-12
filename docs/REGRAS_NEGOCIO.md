# Regras de Negócio e Domínio

A Plataforma de Gestão Contratual implementa regras de negócio estritas para manter a escalabilidade, focar apenas em contratos relevantes e garantir a separação de responsabilidades.

## 1. Classificação de Contratos (Vigência)

Somente contratos **Ativos** importam para o fluxo analítico contínuo. 
O cálculo de atividade se baseia obrigatoriamente na data retornada pela API externa sob a chave `vigencia_fim` (corrigido do falho `data_fim_vigencia`).

### 1.1 Contratos Ativos
* **Regra:** `vigencia_fim >= hoje`
* **Status Interno:** `ativo`
* **Comportamento:**
  * Sincronizam e atualizam o payload principal.
  * Consultam endpoints secundários (empenhos, histórico, garantias, etc) para enriquecimento.
  * Estão elegíveis para análise e processamento de regras pela futura engine.

### 1.2 Contratos Vencidos
* **Regra:** `vigencia_fim < hoje`
* **Status Interno:** `vencido`
* **Comportamento:**
  * Apenas mantêm o registro histórico na base.
  * **NÃO** buscam dados nos endpoints secundários (para evitar requisições redundantes).
  * **NÃO** recalculam análises operacionais dinâmicas.

### 1.3 Contratos com Vigência Indefinida
* **Regra:** A API governamental omitiu ou retornou vazio a propriedade de vigência.
* **Status Interno:** `vigencia_indefinida`
* **Comportamento:** 
  * São tratados provisoriamente como **ATIVOS** (`is_active = True`).
  * Continuam sendo sincronizados e enriquecidos normalmente.
  * Tornam-se alvos específicos para geração de alertas de "inconsistência cadastral" ao usuário.

## 2. Abordagem de Estruturação e Preservação de JSONB

O espelhamento da base externa em um banco SQL completo foi proibido por razões de performance e complexidade artificial.

* **Núcleo Estruturado:** O banco destina colunas explícitas APENAS para chaves estratégicas:
  * Identidade (`id`, `external_id`, `contract_number`)
  * Operacional e Ciclo (`is_active`, `status`)
  * Status e Saúde dos Endpoints (`empenhos_status`, `faturas_status`, etc.)
  * Hashes (`main_hash`, `empenhos_hash`, etc.)
  * Timestamps

* **Payload Integral Preservado (Proteção de Falhas):** O dado bruto da API original é armazenado **como veio**, dentro de campos `JSONB` no PostgreSQL.
  * *Blindagem*: Se uma consulta à API do governo retornar um erro inesperado 503 Gateway Timeout na parte de Faturas, o motor **NUNCA** irá atualizar o JSONB antigo por um Null/Vazio, mantendo as faturas do último ponto sadio vivas.

## 3. Respostas da API (Padronização Universal)

A comunicação com o frontend ou quaisquer outros serviços que consumirem este backend segue uma interface contratual imutável. Para fluxos normais ou sob demanda (refresh):
```json
{
  "success": true,
  "message": "Operação concluída com sucesso.",
  "data": { ... }
}
```
Lógicas complexas e validações acontecem dentro dos *Services*, repassando a falha à camada de *Exceptions* Global (`BusinessException`) para empacotar o erro de volta em um response onde `success` é `false`.

## 4. Separação Estrita de Domínios
Como uma premissa imutável: Nenhuma camada de importação de banco de dados (`sincronizacao`) pode se meter em avaliar lógicas analíticas sobre o contrato (ex: prever se o saldo estourou). Tudo isso flui de forma apartada e unidirecional para a `Engine de Análise`.

## 6. Motor de Análise (Analysis Engine)

O sistema monitora automaticamente inconsistências e riscos operacionais:

### 6.1. Alertas de Vencimento
- **Crítico (<= 7 dias)**: Requer ação imediata de renovação.
- **Alto (<= 15 dias)**: Fase final de vigência.
- **Médio (<= 30 dias)**: Período ideal para formalização de aditivos.
- **Baixo (<= 60 dias)**: Alerta preventivo.
- **Informativo (<= 90 dias)**: Notificação de planejamento.

### 6.2. Falhas de Sincronização
- Contratos com falha em endpoints secundários (Empenhos, Faturas, etc.) geram alertas de integridade para evitar decisões baseadas em dados obsoletos.

### 6.3. Conformidade (Compliance)
- **Responsáveis**: É obrigatório que todo contrato ativo possua pelo menos um responsável técnico ou administrativo cadastrado.
- **Vigência**: Contratos ativos sem data de término definida são considerados inconsistentes e exigem saneamento cadastral.

### 6.4. Idempotência e Resolução
- O sistema não duplica alertas para o mesmo problema (via fingerprint estruturado).
- Alertas são resolvidos automaticamente se a inconsistência for corrigida na fonte governamental.

## 7. KPIs de instrumentos ativos (Painel Executivo × Operações)

### 7.1 Fonte única de verdade (SSOT)

Toda definição de contagem de instrumentos **ativos** ou em **portfólio executivo** está em:

- `backend/modules/contratos/domain/ativo_rules.py`

O **DashboardService** (`GET /api/v1/dashboard/stats`) e o **ContratoRepository** (`GET /api/v1/contracts`) reutilizam a mesma semântica: o primeiro em Python sobre o conjunto de linhas; o segundo em SQL equivalente para listagem e `COUNT`.

### 7.2 Contrato ativo (KPI executivo — card “Contratos Ativos”)

- **Tipo:** exclusivamente `raw_contract["tipo"]` no JSONB espelhado, normalizado com `normalized_tipo_instrumento` (trim + minúsculas). A classificação **contrato** no cockpit e em Operações usa `normalized_tipo_matches_instrument_kind(..., "contrato")`: aceita o exato `contrato` e prefixos `contrato ` (ex.: `Contrato Administrativo`). O mesmo padrão vale para empenho/ata com os prefixos documentados em `ativo_rules.py`. Não há inferência por categoria fora do campo `tipo`.
- **Portfólio ativo:** `is_active` **ou** `status == vigencia_indefinida` **ou** coluna `status` fora das situações terminais (`encerrado`, `vencido`, `cancelado`). Vide `ativo_rules.is_portfolio_row_active`.

**Vigência indeterminada (`status == vigencia_indefinida`):** conta como instrumento **ativo e vigente** nos KPIs de volume e distribuição por unidade, mesmo com `vigencia_fim` nulo. Por política operacional, **não** participa de métricas nem timelines de **vencimento** (`ativo_rules.counts_in_expiration_views`), nem de alertas analíticos de “próximo do vencimento” ou “data ausente” ligados à vigência.

Demais métricas derivadas (criticidade, valor global, risco) aplicam-se ao mesmo subconjunto de **contratos** no cockpit.

### 7.3 Empenhos e atas (indicadores auxiliares)

- **`activeEmpenhos`:** `tipo` ∈ {`empenho`, `empenhos`} e mesma regra de portfólio ativo.
- **`activeAtas`:** `tipo` ∈ {`ata`, `atas`} e mesma regra de portfólio ativo.

Esses totais aparecem no **subtítulo** do card “Contratos Ativos” no Painel Executivo e servem para transparência sem misturar no número principal.

### 7.4 Operações Contratuais (listagem)

- Parâmetro **`instrument_kind`** (padrão `contrato`): restringe o escopo ao mesmo tipo usado no KPI principal.
- Com **`status` omitido** (modo “Portfólio executivo” na UI), a listagem aplica o mesmo predicado de portfólio que o dashboard, garantindo paridade numérica com `kpis.totalActive` quando `instrument_kind=contrato`.
- Com **`status=all`**, não há filtro pela coluna `status` (lista ampla, ainda sujeita ao filtro de `instrument_kind`).

### 7.5 Divergência histórica resolvida

Antes, a listagem usava `status = 'ativo'` e **não** filtrava por `tipo`, enquanto o dashboard contava só `tipo = contrato` com critério de portfólio mais amplo que “somente ativo”. Isso gerava totais diferentes entre telas. Com a padronização acima, os números tornam-se **auditáveis** e **comparáveis** entre módulos.

### 7.6 Composição do portfólio (`instrument_kind=all`)

Em `GET /api/v1/contracts` com **todos os tipos**, o backend devolve `portfolio_composition`: lista ordenada por volume com chave **`normalized_tipo`** (mesma normalização de `normalized_tipo_instrumento`) e **`count`**, sem taxonomia fixa — reflete o que está no banco. Logs em `LOG_LEVEL=DEBUG`: `portfolio_composition_by_normalized_tipo` e `portfolio_tipo_audit_sample` (amostra `raw_contract.tipo` × normalizado).
