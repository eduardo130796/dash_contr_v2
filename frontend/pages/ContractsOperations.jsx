import React, { useState, useMemo } from 'react';
import { useData } from '@/lib/DataContext';
import { getDaysRemaining, formatCurrency, getRiskColor } from '@/lib/contractUtils';
import { StatusBadge, CriticalityBadge } from '@/components/shared/StatusBadge';
import RiskScoreBar from '@/components/shared/RiskScoreBar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, ArrowUpDown, LayoutList, LayoutGrid, ChevronRight, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { LoadingOverlay, ErrorState } from '@/components/shared/DataLoadingState';

export default function ContractsOperations() {
  const { contracts, loading, error } = useData();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [criticalityFilter, setCriticalityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortField, setSortField] = useState('risk_score');
  const [sortDir, setSortDir] = useState('desc');
  const [view, setView] = useState('table');
  const safe = (v) => (v || '').toString().toLowerCase();

    const getStatus = (c) => c.analysis?.status_real || c.status || 'unknown';

    const getDaysSafe = (date) => {
      if (!date) return null;
      const d = new Date(date);
      if (isNaN(d)) return null;
      return Math.floor((d - new Date()) / 86400000);
    };

  const filtered = useMemo(() => {
    let result = [...contracts];

    if (search) {
      const q = search.toLowerCase();

      result = result.filter(c =>
        safe(c.contract_number).includes(q) ||
        safe(c.object).includes(q) ||
        safe(c.contractor).includes(q) ||
        safe(c.manager || '').includes(q)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter(c => getStatus(c) === statusFilter);
    }

    if (criticalityFilter !== 'all') {
      result = result.filter(c => c.criticality === criticalityFilter);
    }

    if (categoryFilter !== 'all') {
      result = result.filter(c => c.category === categoryFilter);
    }

    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'days_remaining') {
        aVal = getDaysSafe(a.end_date) ?? 9999;
        bVal = getDaysSafe(b.end_date) ?? 9999;
      }

      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal == null) aVal = '';
      if (bVal == null) bVal = '';

      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [contracts, search, statusFilter, criticalityFilter, categoryFilter, sortField, sortDir]);
  
  
  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const kanbanStatuses = [
  'ativo_operacional',
  'ativo_sem_execucao',
  'vencido_com_execucao_recente',
  'encerrado'
];

  if (loading) return <LoadingOverlay />;
  if (error)   return <ErrorState message={error} />;

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Central de Operações Contratuais</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} contratos encontrados</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={view === 'table' ? 'default' : 'outline'} size="sm" onClick={() => setView('table')}>
            <LayoutList className="w-4 h-4" />
          </Button>
          <Button variant={view === 'kanban' ? 'default' : 'outline'} size="sm" onClick={() => setView('kanban')}>
            <LayoutGrid className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar contratos..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Situações</SelectItem>
            <SelectItem value="ativo_operacional">Ativo</SelectItem>
            <SelectItem value="ativo_sem_execucao">Ativo (sem execução)</SelectItem>
            <SelectItem value="vencido_com_execucao_recente">Vencido (em execução)</SelectItem>
            <SelectItem value="encerrado">Encerrado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={criticalityFilter} onValueChange={setCriticalityFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Criticality" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Criticidades</SelectItem>
            <SelectItem value="low">Normal</SelectItem>
            <SelectItem value="attention">Atenção</SelectItem>
            <SelectItem value="critical">Crítico</SelectItem>
            <SelectItem value="urgent">Urgente</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Categorias</SelectItem>
            {['services', 'technology', 'infrastructure', 'consulting', 'logistics', 'maintenance', 'security', 'communications'].map(cat => (
              <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {view === 'table' ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-accent/30">
                  {[
                    { key: 'contract_number', label: 'Nº Contrato' },
                    { key: 'object', label: 'Objeto' },
                    { key: 'contractor', label: 'Fornecedor' },
                    { key: 'end_date', label: 'Vencimento' },
                    { key: 'days_remaining', label: 'Dias Restantes' },
                    { key: 'manager', label: 'Gestor' },
                    { key: 'status', label: 'Situação' },
                    { key: 'risk_score', label: 'Risco' },
                  ].map(col => (
                    <th 
                      key={col.key} 
                      className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground"
                      onClick={() => toggleSort(col.key)}
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        {sortField === col.key && <ArrowUpDown className="w-3 h-3" />}
                      </div>
                    </th>
                  ))}
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const days = getDaysSafe(c.end_date);
                  return (
                    <tr key={`${c.id}-${c.start_date}-${c.contractor}`} className="border-b border-border/50 hover:bg-accent/20 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-medium text-primary">{c.contract_number}</span>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <span className="text-xs truncate block">{c.object}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{c.contractor}</td>
                      <td className="px-4 py-3 text-xs tabular-nums">
                        {c.end_date
                          ? (() => {
                              try {
                                const d = parseISO(c.end_date);
                                return isNaN(d) ? '-' : format(d, 'MMM dd, yyyy');
                              } catch {
                                return '-';
                              }
                            })()
                          : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "text-xs font-semibold tabular-nums",
                          days === null ? 'text-muted-foreground' :
                          days <= 30 ? 'text-red-500' :
                          days <= 60 ? 'text-orange-500' :
                          days <= 90 ? 'text-amber-400' :
                          'text-foreground'
                        )}>
                          {days === null ? '-' : days > 0 ? days : 'Vencido'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{c.manager || '-'}</td>
                      <td className="px-4 py-3"><StatusBadge status={getStatus(c)} /></td>
                      <td className="px-4 py-3"><RiskScoreBar score={c.risk_score} size="sm" /></td>
                      <td className="px-4 py-3">
                        <Link to={`/contract/${c.id}`}>
                          <ChevronRight className="w-4 h-4 text-muted-foreground hover:text-primary" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {kanbanStatuses.map(status => {
            const items = filtered.filter(c => getStatus(c) === status);
            return (
              <div key={status} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <StatusBadge status={status} />
                  <span className="text-xs font-medium text-muted-foreground">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.slice(0, 8).map(c => (
                    <Link key={`${c.id}-${c.start_date}-${c.contractor}`} to={`/contract/${c.id}`} className="block p-3 rounded-lg bg-accent/30 hover:bg-accent/60 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-primary">{c.contract_number}</span>
                        <CriticalityBadge criticality={c.criticality} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">{c.object}</p>
                      <div className="flex items-center justify-between mt-2">
                        <RiskScoreBar score={c.risk_score} size="sm" />
                        <span className="text-[10px] text-muted-foreground">{getDaysRemaining(c.end_date)}d</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}