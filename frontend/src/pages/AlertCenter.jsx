import React, { useState, useMemo } from 'react';
import { useData } from '@/lib/DataContext';
import { SeverityBadge } from '@/components/shared/StatusBadge';
import KPICard from '@/components/shared/KPICard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, AlertTriangle, AlertOctagon, CheckCircle2, Clock, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LoadingOverlay, ErrorState } from '@/components/shared/DataLoadingState';

export default function AlertCenter() {
  const { alerts, loading, error } = useData();
  const [severityFilter, setSeverityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');

  const filtered = useMemo(() => {
    let result = [...alerts];
    if (severityFilter !== 'all') result = result.filter(a => a.severity === severityFilter);
    if (typeFilter !== 'all') result = result.filter(a => a.type === typeFilter);
    if (statusFilter !== 'all') result = result.filter(a => a.status === statusFilter);
    return result.sort((a, b) => {
      const sev = { red: 4, orange: 3, yellow: 2, green: 1 };
      return (sev[b.severity] || 0) - (sev[a.severity] || 0);
    });
  }, [alerts, severityFilter, typeFilter, statusFilter]);

  const active = alerts.filter(a => a.status === 'active');
  const red = active.filter(a => a.severity === 'red').length;
  const orange = active.filter(a => a.severity === 'orange').length;
  const yellow = active.filter(a => a.severity === 'yellow').length;

  if (loading) return <LoadingOverlay />;
  if (error)   return <ErrorState message={error} />;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Central de Alertas</h1>
        <p className="text-sm text-muted-foreground">Central de monitoramento de alertas e notificações contratuais</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Total Ativos" value={active.length} icon={Bell} variant="primary" />
        <KPICard title="Alertas Vermelhos" value={red} icon={AlertOctagon} variant="danger" />
        <KPICard title="Alertas Laranja" value={orange} icon={AlertTriangle} variant="warning" />
        <KPICard title="Alertas Amarelos" value={yellow} icon={Clock} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Severidades</SelectItem>
            <SelectItem value="red">Vermelho</SelectItem>
            <SelectItem value="orange">Laranja</SelectItem>
            <SelectItem value="yellow">Amarelo</SelectItem>
            <SelectItem value="green">Verde</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Tipos</SelectItem>
            <SelectItem value="expiration">Vencimento</SelectItem>
            <SelectItem value="overdue_action">Ação em Atraso</SelectItem>
            <SelectItem value="critical_risk">Risco Crítico</SelectItem>
            <SelectItem value="renewal_deadline">Prazo de Renovação</SelectItem>
            <SelectItem value="operational">Operacional</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Situações</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="acknowledged">Reconhecido</SelectItem>
            <SelectItem value="resolved">Resolvido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Alert List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum alerta encontrado para os filtros selecionados.</p>
          </div>
        ) : (
          filtered.map((alert, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors">
              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-2 h-2 rounded-full mt-2 shrink-0",
                  alert.severity === 'red' ? 'bg-red-500 animate-pulse-glow' : 
                  alert.severity === 'orange' ? 'bg-orange-500' : 
                  alert.severity === 'yellow' ? 'bg-amber-400' : 'bg-emerald-500'
                )} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground">{alert.title}</p>
                    <SeverityBadge severity={alert.severity} />
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-muted-foreground capitalize">{alert.type.replace(/_/g, ' ')}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
                  <div className="flex items-center gap-4 mt-2">
                    {alert.due_date && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Prazo: {format(parseISO(alert.due_date), 'dd/MM/yyyy')}
                      </span>
                    )}
                    {alert.contract_number && (
                      <Link to={`/contract/${encodeURIComponent(alert.contract_number)}`} className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                        {alert.contract_number} <ChevronRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}