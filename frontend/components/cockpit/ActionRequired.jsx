import React from 'react';
import { useData } from '@/lib/DataContext';
import { getDaysRemaining } from '@/lib/contractUtils';
import { CriticalityBadge } from '@/components/shared/StatusBadge';
import { AlertTriangle, ArrowRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function ActionRequired() {
  const { contracts } = useData();

  const urgentContracts = contracts
    .filter(c => c.criticality === 'urgent' || c.criticality === 'critical')
    .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))
    .slice(0, 6);

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-foreground">Ação Necessária Hoje</h3>
        </div>
        <Link to="/contracts" className="text-xs text-primary hover:underline flex items-center gap-1">
          Ver todos <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="space-y-2">
        {urgentContracts.map(c => {
          const days = getDaysRemaining(c.end_date);
          return (
            <Link
              key={c.contract_number}
              to={`/contract/${encodeURIComponent(c.contract_number)}`}
              className="flex items-center justify-between p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors group"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-medium text-primary">{c.contract_number}</span>
                  <CriticalityBadge criticality={c.criticality} />
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate">{c.object}</p>
              </div>
              <div className="flex items-center gap-2 ml-3 shrink-0">
                <div className={cn("flex items-center gap-1 text-xs font-medium", days <= 30 ? 'text-red-500' : 'text-amber-400')}>
                  <Clock className="w-3 h-3" />
                  {days > 0 ? `${days}d` : 'Vencido'}
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}