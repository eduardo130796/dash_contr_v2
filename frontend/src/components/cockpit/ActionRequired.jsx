import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { CriticalityBadge } from '@/components/shared/StatusBadge';
import { useQuery } from '@tanstack/react-query';
import { alertasService } from '@/services/alertasService';

export default function ActionRequired({ actions: propActions }) {
  const { data: alertsPayload, isLoading: isLoadingQuery } = useQuery({
    queryKey: ['recentAlerts'],
    queryFn: () => alertasService.getAlerts({ status: 'active', limit: 6 }),
    refetchInterval: 30000,
    enabled: !propActions, // Só busca se não vier via props
  });

  const alerts = useMemo(() => {
    if (propActions) return propActions;
    const payload = alertsPayload?.data || alertsPayload;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.items)) return payload.items;
    return [];
  }, [propActions, alertsPayload]);

  const isLoading = !propActions && isLoadingQuery;

  if (isLoading) return <div className="animate-pulse h-64 bg-accent/20 rounded-xl" />;

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-foreground">Ação Necessária Hoje</h3>
        </div>
        <Link to="/alerts" className="text-xs text-primary hover:underline flex items-center gap-1">
          Ver todos <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="space-y-2">
        {alerts.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">Nenhuma ação crítica pendente.</p>
        ) : (
          alerts.map(alert => {
            // Mapeamento de Severity Backend -> Criticality UI
            const severityMap = {
              critical: 'urgent',
              high: 'critical',
              medium: 'attention',
              low: 'low',
              info: 'low'
            };
            const uiCriticality = severityMap[alert.severity] || 'low';
            
            return (
              <Link
                key={alert.id || alert.contract_number}
                to={alert.contract_id ? `/contract/${alert.contract_id}` : '/alerts'}
                className="block p-3 rounded-lg bg-accent/30 hover:bg-accent transition-all border border-transparent hover:border-border/50 group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono font-bold text-primary tracking-tighter">{alert.contract_number || 'SISTEMA'}</span>
                  <CriticalityBadge criticality={uiCriticality} className="h-4 text-[9px] px-1.5" />
                </div>
                <h4 
                  className="text-xs font-bold text-foreground line-clamp-1 leading-tight first-letter:uppercase lowercase"
                  title={alert.contract_object || 'Objeto não informado'}
                >
                  {alert.contract_object || 'Objeto não informado'}
                </h4>
                <p className="text-[10px] text-muted-foreground font-medium mt-1 uppercase tracking-tight">
                  {alert.title}
                </p>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}