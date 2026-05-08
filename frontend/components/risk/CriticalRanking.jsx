import React, { useMemo } from 'react';
import { useData } from '@/lib/DataContext';
import { CriticalityBadge } from '@/components/shared/StatusBadge';
import RiskScoreBar from '@/components/shared/RiskScoreBar';
import { getDaysRemaining, formatCompactCurrency } from '@/lib/contractUtils';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function CriticalRanking() {
  const { contracts } = useData();

  const ranked = useMemo(() => {
    return [...contracts]
      .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))
      .slice(0, 10);
  }, [contracts]);

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Critical Contracts Ranking</h3>
      <div className="space-y-1">
        {ranked.map((c, i) => {
          const days = getDaysRemaining(c.end_date);
          return (
            <Link
              key={c.contract_number}
              to={`/contract/${encodeURIComponent(c.contract_number)}`}
              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/50 transition-colors group"
            >
              <span className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-primary">{c.contract_number}</span>
                  <CriticalityBadge criticality={c.criticality} />
                </div>
                <p className="text-xs text-muted-foreground truncate">{c.object}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <RiskScoreBar score={c.risk_score} size="sm" />
                <span className="text-xs text-muted-foreground w-10 text-right">
                  {days > 0 ? `${days}d` : 'Exp'}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}