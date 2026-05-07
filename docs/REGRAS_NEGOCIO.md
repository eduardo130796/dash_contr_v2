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
