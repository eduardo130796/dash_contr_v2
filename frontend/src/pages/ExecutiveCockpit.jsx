import React from 'react';
import { useData } from '@/lib/DataContext';
import { formatCompactCurrency } from '@/lib/contractUtils';
import KPICard from '@/components/shared/KPICard';
import ExpirationChart from '@/components/cockpit/ExpirationChart';
import CriticalityDistribution from '@/components/cockpit/CriticalityDistribution';
import ActionRequired from '@/components/cockpit/ActionRequired';
import InsightCards from '@/components/cockpit/InsightCards';
import ClosurePendingCard from '@/components/cockpit/ClosurePendingCard';
import ExpirationTimeline from '@/components/cockpit/ExpirationTimeline';
import {
  FileText, AlertTriangle, Clock, Shield, Crosshair,
  DollarSign, Bell
} from 'lucide-react';
import { format } from 'date-fns';
import { LoadingOverlay, ErrorState } from '@/components/shared/DataLoadingState';

import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboardService';

export default function ExecutiveCockpit() {
  const { loading: dataLoading, error: dataError } = useData();

  const { data: dashboardPayload, isLoading: isLoadingDashboard } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: () => dashboardService.getDashboardStats(),
    refetchInterval: 60000,
  });

  const dashboardData = dashboardPayload?.data || dashboardPayload || {};
  const stats = dashboardData.kpis || {};
  const criticidadeBruta =
    dashboardData.criticality_distribution ?? dashboardData.criticalityDistribution;

  if (dataLoading || isLoadingDashboard) return <LoadingOverlay message="Carregando plataforma de inteligência contratual…" />;
  if (dataError) return <ErrorState message={dataError} />;

  // Dados adicionais para os subcomponentes
  const urgentActions = dashboardData.urgent_actions || [];
  const executiveInsights = dashboardData.executive_insights || [];
  const timelineData = dashboardData.expiration_timeline || [];
  const expirationChartData = dashboardData.expirationTimeline || [];

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* ... header ... */}
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
        <KPICard
          title="Contratos Ativos"
          value={stats.totalActive}
          icon={FileText}
          variant="primary"
          subtitle={`Empenhos: ${stats.activeEmpenhos ?? 0} · Atas: ${stats.activeAtas ?? 0}`}
        />
        <KPICard title="Vencendo em 30d" value={stats.expiring30} icon={Clock} variant="danger" />
        <KPICard title="Vencendo em 60d" value={stats.expiring60} icon={Clock} variant="warning" />
        <KPICard title="Vencendo em 90d" value={stats.expiring90} icon={Clock} />
        <KPICard title="Criticidade Crítica" value={stats.critica} icon={AlertTriangle} variant="danger" />
        <KPICard title="Urgência Contratual" value={stats.urgente} icon={Crosshair} variant="warning" />
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
          value={urgentActions.length || stats.media}
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
        <ExpirationChart data={expirationChartData} />
        <CriticalityDistribution kpis={stats} criticalityDistribution={criticidadeBruta} />
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ActionRequired actions={urgentActions} />
        <InsightCards insights={executiveInsights} />
        <ClosurePendingCard data={dashboardData.closure_pending} />
      </div>

      {/* Timeline */}
      <ExpirationTimeline data={timelineData} />
    </div>
  );
}
