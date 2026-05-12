import React, { useState, useEffect, useCallback } from 'react';
import { formatarMoedaBR, formatarDataBR, getStatusLabel } from '@/utils/formatters';
import { StatusBadge, CriticalityBadge } from '@/components/shared/StatusBadge';
import RiskScoreBar from '@/components/shared/RiskScoreBar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, Filter, ArrowUpDown, LayoutList, LayoutGrid, 
  ChevronRight, ChevronLeft, Download, Loader2 ,CalendarDays, Flag
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ErrorState } from '@/components/shared/DataLoadingState';

export default function ContractsOperations() {
  // Estados de Filtro e Ordenação (SSOT no Backend agora)
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('portfolio');
  const [criticalityFilter, setCriticalityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [instrumentKind, setInstrumentKind] = useState('contrato');
  const [sortField, setSortField] = useState('vigencia_fim');
  const [sortDir, setSortDir] = useState('desc');
  
  // Estados de Paginação e Dados
  const [items, setItems] = useState([]);
  const [portfolioComposition, setPortfolioComposition] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('table');

  // Debounce para busca textual
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Função centralizada de carregamento (Backend Fetch)
  const loadContracts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sort_by: sortField,
        order: sortDir,
      });

      if (debouncedSearch) params.append('search', debouncedSearch);
      if (statusFilter === 'all') {
        params.append('status', 'all');
      } else if (statusFilter !== 'portfolio') {
        params.append('status', statusFilter);
      }
      if (criticalityFilter !== 'all') params.append('criticality', criticalityFilter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      params.append('instrument_kind', instrumentKind);

      const response = await fetch(`/api/v1/contracts?${params.toString()}`);
      if (!response.ok) throw new Error(`Erro API: ${response.status}`);
      
      const payload = await response.json();
      if (payload.success) {
        setItems(payload.data.items);
        setPagination(payload.data.pagination);
        setPortfolioComposition(payload.data.portfolio_composition ?? null);
      } else {
        throw new Error(payload.message || 'Erro ao carregar contratos');
      }
    } catch (err) {
      console.error("[ContractsOperations] Fetch error:", err);
      setError("Falha ao carregar contratos do servidor");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, debouncedSearch, statusFilter, criticalityFilter, categoryFilter, instrumentKind, sortField, sortDir]);

  // Efeito de trigger para recarregar quando filtros mudam
  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  // Reset de página quando filtros mudam
  useEffect(() => {
    setPagination(p => ({ ...p, page: 1 }));
  }, [debouncedSearch, statusFilter, criticalityFilter, categoryFilter, instrumentKind]);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const changePage = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setPagination(p => ({ ...p, page: newPage }));
    }
  };

  const getDaysSafe = (date) => {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = d - today;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const kanbanStatuses = [
    'ativo',
    'vencendo',
    'vencido',
    'suspenso',
    'encerrado'
  ];

  if (error) return <ErrorState message={error} />;

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Central de Operações Contratuais</h1>
          <div>
            <p className="text-sm text-muted-foreground">
              {loading
                ? 'Carregando...'
                : `${pagination.total} ${
                    instrumentKind === 'contrato'
                      ? 'contratos'
                      : instrumentKind === 'all'
                        ? 'instrumentos'
                        : 'registros'
                  } no escopo selecionado`}
            </p>
            {!loading &&
              instrumentKind === 'all' &&
              Array.isArray(portfolioComposition) &&
              portfolioComposition.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed max-w-3xl">
                  <span className="font-medium text-foreground/80">Composição do portfólio</span>
                  {' — '}
                  {portfolioComposition.map((b, i) => (
                    <span key={`${b.normalized_tipo}-${i}`}>
                      {i > 0 ? ' · ' : ''}
                      <span className="tabular-nums font-semibold text-foreground">{b.count}</span>
                      {' «'}
                      {b.normalized_tipo?.trim() ? b.normalized_tipo : 'sem tipo declarado'}
                      {'»'}
                    </span>
                  ))}
                </p>
              )}
          </div>
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
          <Input placeholder="Buscar instrumentos..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-muted-foreground" />}
        </div>
        <Select value={instrumentKind} onValueChange={setInstrumentKind}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Instrumento" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="contrato">Contratos</SelectItem>
            <SelectItem value="empenho">Empenhos</SelectItem>
            <SelectItem value="ata">Atas</SelectItem>
            <SelectItem value="all">Todos os tipos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Situação" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="portfolio">Portfólio executivo</SelectItem>
            <SelectItem value="all">Todas as situações</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="vencendo">Vencendo</SelectItem>
            <SelectItem value="vencido">Vencido</SelectItem>
            <SelectItem value="suspenso">Suspenso</SelectItem>
            <SelectItem value="encerrado">Encerrado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={criticalityFilter} onValueChange={setCriticalityFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Criticidade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Criticidades</SelectItem>
            <SelectItem value="low">Baixa (Normal)</SelectItem>
            <SelectItem value="attention">Média (Atenção)</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
            <SelectItem value="critical">Crítica</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Categorias</SelectItem>
            {['Serviços', 'Tecnologia', 'Infraestrutura', 'Consultoria', 'Logística', 'Manutenção', 'Segurança', 'Comunicações'].map(cat => (
              <SelectItem key={cat} value={cat.toLowerCase()} className="capitalize">{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {view === 'table' ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm relative">
          {loading && <div className="absolute inset-0 bg-background/20 backdrop-blur-[1px] z-10 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>}
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-accent/30">
                  {[
                    { key: 'contract_number', label: 'Nº Contrato' },
                    { key: 'object', label: 'Objeto' },
                    { key: 'fornecedor', label: 'Fornecedor' },
                    { key: 'vigencia', label: 'Vigência', sortDisabled: true },
                    { key: 'days_remaining', label: 'Prazo', sortDisabled: true },
                    { key: 'valor_global', label: 'Valor Global' },
                    { key: 'status', label: 'Situação', sortDisabled: true },
                    { key: 'risk_score', label: 'Risco' },
                  ].map(col => (
                    <th 
                      key={col.key} 
                      className={cn(
                        "text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground",
                        !col.sortDisabled && "cursor-pointer hover:text-foreground"
                      )}
                      onClick={() => !col.sortDisabled && toggleSort(col.key)}
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        {!col.sortDisabled && sortField === col.key && (
                          <ArrowUpDown className="w-3 h-3 text-primary" />
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className={cn(loading && "opacity-50")}>
                {items.length === 0 && !loading && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhum contrato encontrado para os filtros selecionados.
                    </td>
                  </tr>
                )}
                {items.map(c => {
                  const days = getDaysSafe(c.end_date);
                  return (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-accent/20 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-medium text-primary">{c.contract_number}</span>
                      </td>
                      <td className="px-4 py-3 max-w-[380px] min-w-[320px]">
                        <span className="text-xs truncate block" title={c.object}>{c.object}</span>
                      </td>
                      <td className="px-4 py-3 max-w-[160px]">
                        <span
                          className="text-xs text-muted-foreground truncate block"
                          title={c.contractor}
                        >
                          {c.contractor}
                        </span>
                      </td>
                     <td className="px-4 py-3">
                      <div className="flex flex-col leading-tight">
                        
                        <span className="text-[11px] text-muted-foreground">
                          Início: {formatarDataBR(c.start_date)}
                        </span>

                        <span
                          className={cn(
                            "text-xs font-semibold",
                            days <= 30
                              ? "text-red-500"
                              : days <= 60
                              ? "text-orange-500"
                              : days <= 90
                              ? "text-amber-500"
                              : "text-foreground"
                          )}
                        >
                          Fim: {formatarDataBR(c.end_date)}
                        </span>

                      </div>
                    </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "text-xs font-semibold tabular-nums",
                          days === null ? 'text-muted-foreground' :
                          days <= 30 ? 'text-red-500 font-bold' :
                          days <= 60 ? 'text-orange-500' :
                          days <= 90 ? 'text-amber-500' :
                          'text-emerald-500'
                        )}>
                          {days === null ? '-' : days > 0 ? `${days}d` : 'Vencido'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold tabular-nums">
                        {formatarMoedaBR(c.value)}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                      <td className="px-4 py-3"><RiskScoreBar score={c.risk_score} size="sm" /></td>
                      <td className="px-4 py-3">
                        <Link to={`/contract/${c.id}`}>
                          <ChevronRight className="w-4 h-4 text-muted-foreground hover:text-primary transition-transform hover:translate-x-1" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          <div className="px-4 py-3 border-t border-border bg-accent/10 flex items-center justify-between">
            <div className="text-xs text-muted-foreground font-medium">
              Mostrando <span className="text-foreground">{items.length}</span> de <span className="text-foreground">{pagination.total}</span>{' '}
              {instrumentKind === 'contrato' ? 'contratos' : 'registros'}
            </div>
            <div className="flex items-center gap-1">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8" 
                disabled={pagination.page <= 1 || loading}
                onClick={() => changePage(pagination.page - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="text-xs font-bold px-2 tabular-nums">
                Página {pagination.page} de {pagination.pages}
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8" 
                disabled={pagination.page >= pagination.pages || loading}
                onClick={() => changePage(pagination.page + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Kanban View */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          {kanbanStatuses.map(status => {
            const statusItems = items.filter(c => c.status?.toLowerCase() === status);
            return (
              <div key={status} className="bg-card border border-border rounded-xl p-4 flex flex-col h-full min-h-[450px]">
                <div className="flex items-center justify-between mb-4 shrink-0">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={status} />
                    <span className="text-[10px] font-bold text-muted-foreground bg-accent px-1.5 py-0.5 rounded">{statusItems.length}</span>
                  </div>
                </div>
                <div className="space-y-3 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                  {statusItems.map(c => {
                    const days = getDaysSafe(c.end_date);
                    return (
                        <Link key={c.id} to={`/contract/${c.id}`} className="group block p-4 rounded-xl bg-accent/20 border border-border/50 hover:border-primary/30 hover:bg-accent/40 transition-all">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-mono font-bold text-primary">{c.contract_number}</span>
                            <CriticalityBadge criticality={c.criticality} />
                          </div>
                          <p className="text-xs font-bold text-foreground mb-1 line-clamp-2 leading-snug group-hover:text-primary transition-colors">{c.object}</p>
                          <p className="text-[10px] text-muted-foreground truncate mb-3">{c.contractor}</p>
                          
                          <div className="flex items-center justify-between pt-3 border-t border-border/50">
                            <div className="space-y-1">
                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Valor</p>
                                <p className="text-[11px] font-black text-foreground tabular-nums">{formatarMoedaBR(c.value)}</p>
                            </div>
                            <div className="text-right space-y-1">
                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Prazo</p>
                                <span className={cn(
                                    "text-[11px] font-black tabular-nums",
                                    days === null ? 'text-muted-foreground' :
                                    days <= 30 ? 'text-red-500' :
                                    'text-foreground'
                                )}>
                                    {days === null ? '-' : days > 0 ? `${days}d` : 'Vencido'}
                                </span>
                            </div>
                          </div>
                        </Link>
                    );
                  })}
                  {statusItems.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 opacity-30 grayscale">
                        <Loader2 className="w-6 h-6 mb-2" />
                        <p className="text-[10px] font-bold uppercase tracking-widest">Sem registros</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}