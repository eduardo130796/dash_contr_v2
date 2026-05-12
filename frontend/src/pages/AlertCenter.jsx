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

import { useQuery } from '@tanstack/react-query';
import { alertasService } from '@/services/alertasService';
export default function AlertCenter() {
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');

  const { data: alertsPayload, isLoading, error: queryError, refetch } = useQuery({
    queryKey: ['alerts', severityFilter, statusFilter, categoryFilter, search],
    queryFn: () => alertasService.getAlerts({ 
      status: statusFilter === 'all' ? null : statusFilter, 
      severity: severityFilter === 'all' ? null : severityFilter,
      category: categoryFilter === 'all' ? null : categoryFilter,
      search: search || null,
      limit: 50 
    }),
  });

  const { data: statsPayload } = useQuery({
    queryKey: ['alertStats'],
    queryFn: () => alertasService.getAlertStats(),
  });

  const alerts = useMemo(() => {
    const payload = alertsPayload?.data || alertsPayload;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.items)) return payload.items;
    return [];
  }, [alertsPayload]);

  const stats = statsPayload?.data || statsPayload || {};

  const handleMarkAsViewed = async (id) => {
    try {
      await alertasService.markAsViewed(id);
      refetch();
    } catch (err) {
      console.error("Erro ao marcar como visto:", err);
    }
  };

  if (isLoading) return <LoadingOverlay message="Carregando central operacional..." />;
  if (queryError) return <ErrorState message={queryError.message} />;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Central de Alertas</h1>
          <p className="text-sm text-muted-foreground">Monitoramento e governança operacional de riscos contratuais</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bell className="w-8 h-8 text-primary/20 absolute -top-4 -right-4" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Total Ativos" value={stats.active ?? 0} icon={Bell} variant="primary" />
        <KPICard title="Críticos" value={stats.critical ?? 0} icon={AlertOctagon} variant="danger" />
        <KPICard title="Alta Severidade" value={stats.high ?? 0} icon={AlertTriangle} variant="warning" />
        <KPICard title="Resolvidos Hoje" value={stats.resolved_today ?? 0} icon={CheckCircle2} variant="primary" />
      </div>

      {/* Toolbar */}
      <div className="bg-card border border-border rounded-xl p-3 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <input 
            type="text" 
            placeholder="Buscar por contrato ou título..." 
            className="w-full bg-accent/30 border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="h-9 w-32 text-xs"><SelectValue placeholder="Severidade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="critical">Crítico</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="medium">Média</SelectItem>
              <SelectItem value="low">Baixa</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-9 w-36 text-xs"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Categorias</SelectItem>
              <SelectItem value="vigencia">Vigência</SelectItem>
              <SelectItem value="sincronizacao">Sincronização</SelectItem>
              <SelectItem value="compliance">Compliance</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-32 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="viewed">Visto</SelectItem>
              <SelectItem value="resolved">Resolvido</SelectItem>
              <SelectItem value="dismissed">Dispensado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Alert List */}
      <div className="space-y-3">
        {alerts.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-16 text-center">
            <div className="w-12 h-12 bg-accent/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Tudo em ordem</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
              Nenhum alerta pendente para os critérios selecionados no momento.
            </p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div key={alert.id} className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 transition-all group">
              <div className="p-4 flex flex-col md:flex-row gap-4">
                {/* Indicator */}
                <div className={cn(
                  "w-1 md:w-1.5 self-stretch rounded-full shrink-0",
                  alert.severity === 'critical' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 
                  alert.severity === 'high' ? 'bg-orange-500' : 
                  alert.severity === 'medium' ? 'bg-amber-400' : 'bg-emerald-500'
                )} />

                <div className="flex-1 min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase tracking-tighter">
                        {alert.contract_number || 'SISTEMA'}
                      </span>
                      <h3 className="text-sm font-bold text-foreground truncate">{alert.title}</h3>
                      <SeverityBadge severity={alert.severity} className="h-5 text-[10px]" />
                    </div>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 bg-accent/50 px-2 py-0.5 rounded">
                      <Clock className="w-3 h-3" />
                      {alert.created_at ? format(parseISO(alert.created_at), 'dd/MM HH:mm') : '—'}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed italic border-l-2 border-accent pl-2">
                    "{alert.message}"
                  </p>

                  {alert.recommended_action && (
                    <div className="bg-accent/30 p-2 rounded-lg border border-border/50">
                      <div className="flex items-center gap-1.5 mb-1">
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                        <span className="text-[10px] font-bold uppercase text-foreground">Ação Recomendada</span>
                      </div>
                      <p className="text-xs text-foreground font-medium">{alert.recommended_action}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-[10px] text-muted-foreground pt-1">
                    <span className="flex items-center gap-1 capitalize">
                      <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                      {alert.category}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                      Fonte: <span className="font-medium">{alert.source?.replace('_', ' ')}</span>
                    </span>
                    {alert.contract_number && (
                      <Link 
                        to={`/contract/${alert.contract_id}`} 
                        className="text-primary font-bold hover:underline flex items-center gap-0.5 ml-auto md:ml-0"
                      >
                        Ver Contrato 360 <ChevronRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex md:flex-col justify-end gap-2 shrink-0 md:border-l border-border md:pl-4">
                  {alert.status === 'active' && (
                    <button 
                      onClick={() => handleMarkAsViewed(alert.id)}
                      className="text-[10px] font-bold py-2 px-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3 h-3" /> Marcar como Visto
                    </button>
                  )}
                  <button className="text-[10px] font-bold py-2 px-3 rounded-lg bg-accent text-foreground hover:bg-accent/80 transition-colors border border-border">
                    Dispensar
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}