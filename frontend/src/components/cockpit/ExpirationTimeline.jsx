import React, { useMemo } from 'react';
import { useData } from '@/lib/DataContext';
import { getDaysRemaining, formatCompactCurrency } from '@/lib/contractUtils';
import { CriticalityBadge } from '@/components/shared/StatusBadge';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

export default function ExpirationTimeline() {
  const { contracts } = useData();

  const upcoming = useMemo(() => {
    return contracts
      .filter(c => {
        const d = getDaysRemaining(c.end_date);
        return d > 0 && d <= 180;
      })
      .sort((a, b) => new Date(a.end_date) - new Date(b.end_date))
      .slice(0, 8);
  }, [contracts]);

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Linha do Tempo de Vencimentos</h3>
      <div className="space-y-0">
        {upcoming.map((c, i) => {
          const days = getDaysRemaining(c.end_date);
          return (
            <div key={c.contract_number} className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
              <div className="w-16 text-center shrink-0">
                <div className={cn("text-lg font-bold tabular-nums", days <= 30 ? 'text-red-500' : days <= 60 ? 'text-orange-500' : 'text-amber-400')}>
                  {days}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase">dias</div>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-primary">{c.contract_number}</span>
                  <CriticalityBadge criticality={c.criticality} />
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{c.object}</p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs font-medium text-foreground">{formatCompactCurrency(c.value)}</div>
                <div className="text-[10px] text-muted-foreground">{format(parseISO(c.end_date), 'MMM dd')}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}