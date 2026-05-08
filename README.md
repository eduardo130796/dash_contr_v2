# Plataforma de Inteligência em Contratos

Plataforma premium para gestão, monitoramento e análise preditiva de contratos baseada em FastAPI e React.

## Estrutura do Projeto

### Backend (FastAPI)
Localizado em `/backend`, segue uma arquitetura modular orientada a domínios:

- `backend/core/`: Infraestrutura transversal (DB, Segurança, Logging).
- `backend/modules/dashboard/`: KPIs e estatísticas executivas (Executive Cockpit).
- `backend/modules/contratos/`: Camada operacional (listagem paginada, filtros, busca no backend).
- `backend/modules/sincronizacao/`: Engine de ingestão e normalização de dados.
- `backend/modules/alertas/`: Motor de análise e geração de notificações (próxima fase).

### Frontend (React + Vite)
Localizado em `/frontend`, utiliza uma arquitetura baseada em componentes e hooks:

- `frontend/src/pages/`: Telas principais (Cockpit, Operações, 360).
- `frontend/src/components/`: Componentes reutilizáveis e UI (shadcn/ui).
- `frontend/src/lib/`: Contextos, Utilitários e Camada de Dados.

## Setup Inicial

### 1. Backend
```bash
# Criar ambiente virtual
python -m venv venv
source venv/bin/activate  # ou venv\Scripts\activate no Windows

# Instalar dependências
pip install -r backend/requirements.txt

# Rodar servidor
uvicorn backend.main:app --reload --port 8000
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```

### 3. Docker (Full Stack)
```bash
docker-compose up --build
```

## Diretrizes de Desenvolvimento

1. **SSOT (Single Source of Truth):** Toda a lógica de negócio e cálculos de KPIs devem residir no Backend.
2. **Arquitetura Limpa:** Módulos devem ser independentes e seguir o padrão Router -> Service -> Repository.
3. **UX Integrada:** O frontend deve ser uma camada fina de interface, delegando filtros e paginação complexa para a API.
