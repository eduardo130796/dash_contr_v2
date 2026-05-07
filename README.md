# Plataforma de Gestão Contratual - Backend

Núcleo backend oficial da Plataforma de Gestão Contratual, desenvolvido com foco em alta escalabilidade, separação estrita de responsabilidades operacionais e extração assíncrona resiliente.

O sistema atua como o **Source of Truth** (fonte da verdade) de arquitetura escalável da aplicação, enriquecendo dados a partir da API pública governamental. Ele persiste grandes blocos originais em `JSONB` no PostgreSQL (Supabase) para a futura *Engine Analítica* extrair inteligência, sem acoplamento entre a fase de importação e a fase de cálculo.

## Tecnologias e Stack

- **Linguagem:** Python 3.12
- **Framework Web:** FastAPI
- **Banco de Dados:** PostgreSQL (hospedado no Supabase)
- **ORM e Migrations:** SQLAlchemy 2.0 (Assíncrono via `psycopg`) + Alembic
- **Jobs & Cron:** APScheduler (Orquestrador Inteligente)
- **Validação de Dados:** Pydantic v2
- **Cliente HTTP:** HTTPX (Assíncrono)
- **Logs:** Structlog (JSON Output)
- **Infraestrutura:** Docker e Docker Compose

## Estrutura de Diretórios e Módulos

A arquitetura do backend é baseada em módulos autônomos e desacoplados.

```
backend/
├── app/                  # (Opcional - lógicas genéricas se aplicável)
├── core/                 # Configurações transversais do sistema
│   ├── config/           # Variáveis de ambiente e regras dinâmicas (ex: Rate Limit)
│   ├── database/         # Engine Async e SessionMaker
│   ├── logging/          # Structlog configurado para JSON em produção
│   ├── responses/        # Padronização restrita de respostas JSON API
│   └── exceptions/       # Manipuladores de exceção e padronização de erro
├── modules/              # Domínios centrais isolados
│   ├── alertas/          # Lifecycle, status e severidade de avisos e inconsistências
│   ├── auditoria/        # Rastreabilidade de ações (alert_history)
│   ├── contratos/        # Núcleo da persistência de payloads JSONB, hashes e stauts
│   ├── notificacoes/     # Integração multicanal futura (WhatsApp/Email)
│   └── sincronizacao/    # Httpx, Rate Limits, Checkpoints, Paginação e Orquestração
└── migrations/           # Versionamento de base de dados e schemas via Alembic
```

## Setup e Execução Local

**1. Ambiente Virtual e Deps:**
Certifique-se de configurar o arquivo `.env` com todas as senhas, URLs da API governamental e a nova chave estrutural `SYNC_RATE_LIMIT=1.0`.

**2. Executar via Docker (Obrigatório em Prod):**
```bash
docker-compose up --build -d
```
A API exposta (`http://localhost:8000/docs`) trará os painéis de endpoint para Sincronização Sob Demanda e demais módulos.

**3. Migrations (Alembic):**
As modificações na base estruturada devem **sempre** ser feitas via migrations:
```bash
alembic revision --autogenerate -m "Sua alteracao"
alembic upgrade head
```

## Padrões Arquiteturais Obrigatórios

1. **Separação entre Sincronização e Análise:** É expressamente proibido calcular inconsistências ou alertas na camada de fetch de dados (`SincronizacaoService`). A Sincronização serve exclusivamente para espelhar dados, paginar lotes com robustez, manter `locks` de concorrência e evitar queda do sistema. A Análise é feita *a posteriori* em outra Engine.
2. **JSONB para Payloads:** Dados como empenhos e faturas devem ser lidos como vieram. O sistema NÃO sobrescreve a coluna JSONB local com NULO/Vazio se o respectivo endpoint da API do Comprasnet cair. Ele mantém o dado velho como fallback e adiciona a flag `failed` na coluna de rastreio de status (ex: `empenhos_status`).
3. **Checkpoints e Retries Contínuos:** Sincronizações grandes (Bootstrap) paginam arrays em lotes de memória, gravando o estado na tabela `sync_executions`. Quedas retornam a varredura do ponto em que parou sem onerar a rede ou a memória.

## Documentação Viva (Core Architecture)

Consulte a pasta `docs/` para se aprofundar na "Bíblia" do comportamento operacional. Ignorar esses arquivos na evolução futura da aplicação causará a quebra dos pilares do sistema:
- `docs/REGRAS_NEGOCIO.md`
- `docs/SINCRONIZACAO.md`
- `docs/ENDPOINTS.md`
- `docs/FLUXOS.md`
- `docs/ANALISES_FUTURAS.md`
- `docs/ALERTAS.md`
