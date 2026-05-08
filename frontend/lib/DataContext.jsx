import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';

const DataContext = createContext();

function buildStats(contracts, alerts) {
  const active = contracts.filter(c => c.status !== 'expired' && c.status !== 'suspended');

  const daysTo = c => {
    if (!c.end_date) return Infinity;
    return Math.floor((new Date(c.end_date) - new Date()) / 86_400_000);
  };

  return {
    totalActive:   active.length,
    expiring30:    active.filter(c => { const d = daysTo(c); return d > 0 && d <= 30;  }).length,
    expiring60:    active.filter(c => { const d = daysTo(c); return d > 0 && d <= 60;  }).length,
    expiring90:    active.filter(c => { const d = daysTo(c); return d > 0 && d <= 90;  }).length,
    expiring180:   active.filter(c => { const d = daysTo(c); return d > 0 && d <= 180; }).length,
    critical:      contracts.filter(c => c.criticality === 'critical' || c.criticality === 'urgent').length,
    urgent:        contracts.filter(c => c.criticality === 'urgent').length,
    strategic:     contracts.filter(c => c.is_strategic).length,
    totalValue:    contracts.reduce((s, c) => s + (c.value || 0), 0),
    activeAlerts:  alerts.length,
    redAlerts:     alerts.filter(a => a.severity === 3).length,
  };
}

export function DataProvider({ children }) {
  const [contracts, setContracts] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [events, setEvents] = useState([]);        // ainda mock (depois fazemos)
  const [amendments, setAmendments] = useState([]);// ainda mock
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API = "https://solid-space-funicular-qx5xr6qvw56h4476-8000.app.github.dev";
  useEffect(() => {
    async function loadData() {
      try {

        const res = await fetch(`${API}/api/dashboard`, {
          credentials: "include",
        });
        console.log(res);
        console.log("FETCH URL:", `${API}/api/dashboard`);

        const text = await res.text();
        console.log(text);

        const data = JSON.parse(text)

        //const data = await res.json();

        setContracts(data.contracts || []);
        setAlerts(data.alerts || []);

        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Erro ao carregar dados");
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const stats = useMemo(() => buildStats(contracts, alerts), [contracts, alerts]);

  return (
    <DataContext.Provider value={{
      contracts,
      alerts,
      events,
      amendments,
      stats,
      loading,
      error,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);