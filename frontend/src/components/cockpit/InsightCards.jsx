import React, { useMemo } from 'react';
import { useData } from '@/lib/DataContext';
import { Lightbulb, TrendingUp, AlertOctagon, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function InsightCards({ insights: backendInsights }) {
  const { contracts, stats } = useData();

  const insights = useMemo(() => {
    if (backendInsights && backendInsights.length > 0) {
      const iconMap = {
        renewal_peak: Calendar,
        critical_risk: AlertOctagon,
        sync_issue: Lightbulb,
        healthy: Lightbulb
      };
      
      const colorMap = {
        critical: 'text-red-500',
        high: 'text-orange-500',
        medium: 'text-amber-400',
        low: 'text-emerald-500',
        info: 'text-primary'
      };

      const bgMap = {
        critical: 'bg-red-500/10',
        high: 'bg-orange-500/10',
        medium: 'bg-amber-400/10',
        low: 'bg-emerald-500/10',
        info: 'bg-primary/10'
      };

      return backendInsights.map(insight => ({
        icon: iconMap[insight.type] || Lightbulb,
        color: colorMap[insight.severity] || 'text-primary',
        bg: bgMap[insight.severity] || 'bg-primary/10',
        title: insight.title,
        description: insight.description.split('.')[0] + '.' // Pega apenas a primeira frase se for longo
      }));
    }

    // Fallback Legado (mantido apenas por segurança)
    const items = [];
    if (stats.expiring60 > 0) {
      items.push({
        icon: Calendar,
        color: 'text-amber-400',
        bg: 'bg-amber-400/10',
        title: `${stats.expiring60} contratos necessitam de ação em 60 dias`,
        description: 'Revisar e iniciar processos de renovação para vencimentos próximos.',
      });
    }
    return items.slice(0, 3);
  }, [backendInsights, stats]);

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-primary" />
        Insights Estratégicos
      </h3>
      <div className="space-y-3">
        {insights.map((insight, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-accent/30">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", insight.bg)}>
              <insight.icon className={cn("w-4 h-4", insight.color)} />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{insight.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{insight.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}