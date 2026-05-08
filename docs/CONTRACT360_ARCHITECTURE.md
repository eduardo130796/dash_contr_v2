# Arquitetura Contract 360 (Visão Analítica)

O Contract 360 é o núcleo analítico da plataforma, consolidando dados operacionais, financeiros e de risco em uma única visão estruturada.

## 1. Fluxo de Composição (Backend)

O backend assume a responsabilidade total pela inteligência de dados, desonerando o frontend de cálculos e normalizações complexas.

### Módulo: `contratos`
- **Endpoint:** `GET /api/v1/contracts/{id}`
- **Service:** `ContratoService.get_contract_360(contract_id)`
- **Responsabilidades:**
  - Agregar dados de múltiplos payloads JSONB (`raw_contract`, `raw_empenhos`, `raw_historico`, `raw_responsaveis`, `raw_itens`, etc.)
  - Normalizar nomenclaturas para o domínio de negócio (Português).
  - Calcular progressão temporal e financeira real.
  - Derivar a `situacao_real` (ativo, vencendo, vencido, etc.) a partir da vigência e status.
  - Agrupar empenhos por exercício fiscal e ordenar cronologicamente.
  - Mapear flags de análise em alertas estruturados (`AlertaSchema`).

## 2. Estrutura Oficial do Payload (Contrato360Response)

O payload é o SSOT (Single Source of Truth) absoluto para o frontend.

```json
{
  "resumo": {
    "numero": "123/2024",
    "objeto": "Objeto do Contrato...",
    "fornecedor": "RAZAO SOCIAL FORNECEDOR",
    "categoria": "Serviços / Tecnologia / etc",
    "unidade": "Unidade de Compra",
    "modalidade": "Pregão Eletrônico",
    "processo": "000.000/2024",
    "situacao_real": "ativo | vencendo | vencido | suspenso | encerrado",
    "is_estrategico": true,
    "vencimento": "2025-12-31",
    "dias_restantes": 365,
    "valor_global": 1500000.00,
    "gestor": "Nome do Gestor"
  },
  "financeiro": {
    "total_pago": 500000.00,
    "total_empenhado": 1000000.00,
    "execucao_global": 50.0,
    "ano_atual": 2024,
    "exercicios": [
      {
        "ano": 2024,
        "pago": 500000.00,
        "empenhado": 1000000.00,
        "rp": 0.0,
        "execucao": 50.0,
        "itens": []
      }
    ]
  },
  "timeline": [
    {
      "data": "2024-01-01",
      "tipo": "assinatura",
      "titulo": "Contrato Assinado",
      "descricao": "Assinatura do termo principal",
      "ator": "NOME DO USUARIO"
    }
  ],
  "alertas": [
    {
      "id": "alert-0",
      "tipo": "automatico",
      "titulo": "Vencimento Próximo",
      "descricao": "Contrato vence em menos de 30 dias.",
      "severidade": "red | yellow | blue",
      "data": "2024-05-08T00:00:00Z"
    }
  ],
  "riscos": {
    "score": 25,
    "saude": 75,
    "nivel": "baixo | médio | alto | crítico",
    "fatores": []
  },
  "responsaveis": [
    {
      "titulo": "Fiscal Técnico",
      "principal": { "nome": "...", "cpf": "...", "situacao": "Ativo", "tipo": "Titular" },
      "substituto": null
    }
  ],
  "metadata": {
    "last_sync": "2024-05-08T10:00:00Z",
    "status_sync": "success",
    "recommended_actions": []
  }
}
```

## 3. Camada de Apresentação (Frontend)

O frontend torna-se uma camada de renderização pura ("Pure Renderer"):
- **Padronização:** Todas as datas e valores são formatados via `frontend/src/utils/formatters.js`.
- **Resiliência:** Utiliza Optional Chaining (`?.`) e Fallbacks (`?? []`) em todos os componentes.
- **Dumb Components:** Os componentes recebem fatias do payload e apenas as renderizam, sem transformar dados.

## 4. Regras de Domínio Aplicadas

- **Datas:** Exibidas sempre em formato brasileiro `DD/MM/YYYY`.
- **Moeda:** Exibida em `R$ 0,00`.
- **Situação:** Consolidada no campo `situacao_real`. O frontend não deve derivar status a partir de datas.
- **Filtros:** A listagem operacional (`/contracts`) retorna por padrão apenas contratos **ativos**.
