import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '@/lib/DataContext';
import { getDaysRemaining, formatCompactCurrency } from '@/lib/contractUtils';
import { CriticalityBadge } from '@/components/shared/StatusBadge';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

export default function ExpirationTimeline({ data: backendTimeline }) {
  const { contracts } = useData();

  const upcoming = useMemo(() => {
    if (backendTimeline && backendTimeline.length > 0) {
      return backendTimeline.map(item => ({
        contract_id: item.contract_id,
        contract_number: item.contract_number,
        contract_object: item.contract_object,
        days_remaining: item.days_remaining,
        severity: item.severity,
        expiration_date: item.expiration_date,
        criticality: item.severity === 'critical' ? 'urgent' : item.severity === 'high' ? 'critical' : 'attention',
        object: item.contract_object || 'Objeto não informado'
      }));
    }

    return contracts
      .filter(c => {
        const d = getDaysRemaining(c.end_date);
        return d > 0 && d <= 180;
      })
      .sort((a, b) => new Date(a.end_date) - new Date(b.end_date))
      .slice(0, 8)
      .map(c => ({
        ...c,
        days_remaining: getDaysRemaining(c.end_date)
      }));
  }, [contracts, backendTimeline]);

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Linha do Tempo de Vencimentos</h3>
      <div className="space-y-0">
        {upcoming.map((c, i) => {
          const days = c.days_remaining ?? 0;
          const dateStr = c.expiration_date || c.end_date;
          return (
            <Link 
              key={c.contract_number + i} 
              to={c.contract_id ? `/contract/${c.contract_id}` : '/contracts'}
              className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0 hover:bg-accent/20 transition-all group px-2 -mx-2 rounded-md"
            >
              {/* Esquerda: Destaque de Prazo */}
              <div className="w-12 text-center shrink-0">
                <div className={cn(
                  "text-xl font-black tabular-nums leading-none", 
                  days <= 30 ? 'text-red-500' : days <= 60 ? 'text-orange-500' : 'text-amber-500'
                )}>
                  {days}
                </div>
                <div className="text-[8px] text-muted-foreground uppercase font-black mt-1">DIAS</div>
              </div>

              <div className="w-px h-8 bg-border/50" />

              {/* Centro: Identificação e Objeto */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-mono font-bold text-primary tracking-tighter">{c.contract_number}</span>
                  <CriticalityBadge criticality={c.criticality} className="h-3.5 text-[8px] px-1" />
                </div>
                <h4 
                  className="text-xs font-bold text-foreground truncate leading-tight first-letter:uppercase lowercase"
                  title={c.contract_object || c.object}
                >
                  {c.contract_object || c.object}
                </h4>
              </div>

              {/* Direita: Data */}
              <div className="text-right shrink-0 border-l border-border pl-3 ml-1 min-w-[45px]">
                <div className="text-xs font-black text-foreground uppercase tabular-nums leading-none mb-1">
                  {dateStr ? format(parseISO(dateStr), 'dd') : '—'}
                </div>
                <div className="text-[9px] font-bold text-muted-foreground uppercase leading-none">
                  {dateStr ? format(parseISO(dateStr), 'MMM') : '—'}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}