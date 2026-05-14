import React from 'react';
import { useData } from '@/lib/DataContext';
import KPICard from '@/components/shared/KPICard';
import RiskMatrix from '@/components/risk/RiskMatrix';
import CriticalRanking from '@/components/risk/CriticalRanking';
import RiskHeatMap from '@/components/risk/RiskHeatMap';
import { Shield, AlertTriangle, AlertOctagon, Activity } from 'lucide-react';
import { LoadingOverlay, ErrorState } from '@/components/shared/DataLoadingState';

export default function RiskCenter() {
  const { contracts, stats, loading, error } = useData();
  if (loading) return <LoadingOverlay />;
  if (error)   return <ErrorState message={error} />;

  const avgRisk = Math.round(contracts.reduce((sum, c) => sum + (c.risk_score || 0), 0) / contracts.length);
  const highRisk = contracts.filter(c => c.risk_score >= 70).length;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Centro de Risco e Criticidade</h1>
        <p className="text-sm text-muted-foreground">Avaliação automatizada de risco e monitoramento de criticidade</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Risco Médio" value={avgRisk} subtitle="Média do portfólio" icon={Activity} variant={avgRisk >= 50 ? 'danger' : 'warning'} />
        <KPICard title="Alto Risco" value={highRisk} subtitle="Pontuação ≥ 70" icon={AlertTriangle} variant="danger" />
        <KPICard title="Estratégicos" value={stats.estrategica} subtitle="Alto impacto institucional" icon={AlertOctagon} variant="danger" />
        <KPICard title="Alta Criticidade" value={stats.alta} subtitle="Criticidade elevada" icon={Shield} variant="warning" />
      </div>

      {/* Matrix + Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RiskMatrix />
        <CriticalRanking />
      </div>

      {/* Heat Map */}
      <RiskHeatMap />
    </div>
  );
}