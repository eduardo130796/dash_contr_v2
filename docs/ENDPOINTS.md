# Documentação dos Endpoints

A plataforma possui rotas projetadas seguindo os padrões RESTful, onde a inteligência fica na camada de `Services` e as respostas seguem uma padronização universal estrita.

## Padrão de Resposta Oficial
Qualquer rota existente na plataforma **deve** devolver o seguinte encapsulamento padrão JSON:
```json
{
  "success": true,
  "message": "Descrição do que ocorreu",
  "data": { ... } // Payload de dados úteis
}
```
Exceções globais (400, 404, 500) devolvem a mesma estrutura com `"success": false` interceptado pelo `BusinessException`.

## Módulo: Sincronização Sob Demanda

Estes endpoints foram desenvolvidos para prover flexibilidade ao painel administrativo. Eles operam com **Concurrency Locks (asyncio.Lock)**, ou seja, se duas chamadas idênticas forem feitas simultaneamente, a segunda aguardará a conclusão da primeira, prevenindo duplicação de requests na API externa e impedindo bloqueio de I/O de banco.

### 1. Atualização Completa do Contrato
**`POST /api/v1/sincronizacao/contrato/{external_id}/refresh`**
- **Objetivo**: Forçar a leitura do payload principal e dos seus 6 endpoints secundários diretamente da API governamental.
- **Funcionamento**: Aplica `asyncio.sleep` (Rate Limit) configurado via `.env` a cada fetch secundário. Verifica hashes localmente.
- **Resposta**: Retorna sucesso apontando que as comparações incrementais foram recalculadas para aquele contrato específico.

### 2. Atualização de Endpoint Secundário Específico
**`POST /api/v1/sincronizacao/contrato/{external_id}/refresh/{endpoint}`**
- **Objetivo**: Forçar atualização de apens um sub-domínio do contrato (Ex: Se o analista sabe que subiu um "empenho" novo hoje).
- **Parâmetros permitidos (`endpoint`)**: `empenhos`, `faturas`, `historico`, `garantias`, `responsaveis`, `itens`.
- **Funcionamento**: Respeita os locks atrelados ao `external_id` (nenhuma outra sincronização neste ID ocorrerá até esta terminar).
- **Tratamento de Falha**: Se a API do governo falhar, a rota retornará 200/Sucesso (o request fluiu bem), mas internamente ele atualizará a flag do contrato para `empenhos_status = 'failed'`, mantendo os dados intactos.
