import React from 'react';
import { useData } from '@/lib/DataContext';
import { formatCompactCurrency } from '@/lib/contractUtils';
import KPICard from '@/components/shared/KPICard';
import ExpirationChart from '@/components/cockpit/ExpirationChart';
import CriticalityDistribution from '@/components/cockpit/CriticalityDistribution';
import ActionRequired from '@/components/cockpit/ActionRequired';
import InsightCards from '@/components/cockpit/InsightCards';
import ContractsByUnit from '@/components/cockpit/ContractsByUnit';
import ExpirationTimeline from '@/components/cockpit/ExpirationTimeline';
import { 
  FileText, AlertTriangle, Clock, Shield, Crosshair, 
  DollarSign, Bell
} from 'lucide-react';
import { format } from 'date-fns';
import { LoadingOverlay, ErrorState } from '@/components/shared/DataLoadingState';

export default function ExecutiveCockpit() {
  const { stats, loading, error } = useData();

  if (loading) return <LoadingOverlay message="Carregando plataforma de inteligência contratual…" />;
  if (error)   return <ErrorState message={error} />;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Painel Executivo</h1>
          <p className="text-sm text-muted-foreground">
            Inteligência de Contratos — {format(new Date(), "dd/MM/yyyy 'às' HH:mm")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-emerald-500 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-glow" />
            Sistema Operacional
          </span>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <KPICard title="Contratos Ativos" value={stats.totalActive} icon={FileText} variant="primary" />
        <KPICard title="Vencendo em 30d" value={stats.expiring30} icon={Clock} variant="danger" />
        <KPICard title="Vencendo em 60d" value={stats.expiring60} icon={Clock} variant="warning" />
        <KPICard title="Vencendo em 90d" value={stats.expiring90} icon={Clock} />
        <KPICard title="Críticos" value={stats.critical} icon={AlertTriangle} variant="danger" />
        <KPICard title="Estratégicos" value={stats.strategic} icon={Crosshair} variant="primary" />
        <KPICard title="Alertas Ativos" value={stats.activeAlerts} icon={Bell} variant="warning" />
      </div>

      {/* Portfolio Value */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <KPICard 
          title="Valor Total do Portfólio" 
          value={formatCompactCurrency(stats.totalValue)} 
          icon={DollarSign} 
          subtitle="Soma de todos os contratos ativos"
          variant="primary"
        />
        <KPICard 
          title="Ações Urgentes" 
          value={stats.urgent} 
          icon={Shield} 
          subtitle="Requerem decisão executiva imediata"
          variant="danger"
        />
        <KPICard 
          title="Alertas Vermelhos" 
          value={stats.redAlerts} 
          icon={AlertTriangle} 
          subtitle="Alertas de máxima severidade ativos"
          variant="danger"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ExpirationChart />
        <CriticalityDistribution />
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ActionRequired />
        <InsightCards />
        <ContractsByUnit />
      </div>

      {/* Timeline */}
      <ExpirationTimeline />
    </div>
  );
}