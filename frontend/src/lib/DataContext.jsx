import React, { createContext, useContext, useEffect, useState } from 'react';

const DataContext = createContext();

/**
 * DataProvider — Camada de dados global da aplicação.
 * 
 * PADRÃO: Todas as chamadas usam caminhos relativos (/api/v1/...) 
 * delegando a resolução para o Proxy do Vite (dev) ou Servidor Web (prod).
 */
const EMPTY_STATS = {
  totalActive: 0,
  activeEmpenhos: 0,
  activeAtas: 0,
  expiring30: 0,
  expiring60: 0,
  expiring90: 0,
  expiring180: 0,
  critical: 0,
  urgent: 0,
  attention: 0,
  low: 0,
  strategic: 0,
  totalValue: 0,
  activeAlerts: 0,
  redAlerts: 0,
  averageRisk: 0,
  highRiskCount: 0,
};

/**
 * DataProvider — Camada de dados global da aplicação.
 *
 * ANTES: baixava todos os contratos e calculava stats no cliente (buildStats).
 * AGORA: consome /api/v1/dashboard/stats e recebe KPIs já calculados pelo backend.
 *
 * Regras de negócio que migraram para o backend (DashboardService):
 *  - totalActive, expiring30/60/90/180
 *  - critical, urgent, strategic
 *  - totalValue (reduce anterior)
 *  - activeAlerts, redAlerts
 *  - averageRisk, highRiskCount
 */
export function DataProvider({ children }) {
  const [stats, setStats]           = useState(EMPTY_STATS);
  const [contracts, setContracts]   = useState([]);   // mantido para Contract360 e Operations
  const [alerts, setAlerts]         = useState([]);
  const [events, setEvents]         = useState([]);
  const [amendments, setAmendments] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        // ── 1. KPIs do Dashboard (backend calcula tudo) ────────────────────
        const statsRes = await fetch(`/api/v1/dashboard/stats`, {
          credentials: "include",
        });

        if (!statsRes.ok) {
          throw new Error(`Erro ao buscar stats: ${statsRes.status}`);
        }

        const statsPayload = await statsRes.json();
        // APIResponse: { success, message, data: { kpis: {...} } }
        setStats({ ...EMPTY_STATS, ...(statsPayload.data?.kpis ?? {}) });

        // ── 2. Lista de contratos (para Operations + Contract360) ──────────
        // Ainda consome /api/dashboard até o endpoint /api/v1/contracts
        // paginado estar implementado (próxima fase).
        // Se /api/dashboard falhar, mantemos arrays vazios — os KPIs já vieram
        // do endpoint dedicado e o cockpit continuará funcionando.

      } catch (err) {
        console.error("[DataContext] Erro ao carregar dados:", err);
        setError("Erro ao carregar dados");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <DataContext.Provider value={{
      contracts,
      alerts,
      events,
      amendments,
      stats,           // KPIs calculados pelo backend
      loading,
      error,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);