import React, { useMemo } from 'react';
import { useData } from '@/lib/DataContext';
import { Lightbulb, TrendingUp, AlertOctagon, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function InsightCards() {
  const { contracts, stats } = useData();

  const insights = useMemo(() => {
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
    
    if (stats.urgent > 2) {
      items.push({
        icon: AlertOctagon,
        color: 'text-red-500',
        bg: 'bg-red-500/10',
        title: 'Concentração de risco detectada',
        description: `${stats.urgent} contratos em criticidade urgente requerem atenção executiva imediata.`,
      });
    }

    const categories = {};
    contracts.forEach(c => { categories[c.category] = (categories[c.category] || 0) + 1; });
    const topCat = Object.entries(categories).sort(([,a], [,b]) => b - a)[0];
    if (topCat) {
      items.push({
        icon: TrendingUp,
        color: 'text-primary',
        bg: 'bg-primary/10',
        title: `Concentração do portfólio em ${topCat[0]}`,
        description: `${topCat[1]} contratos (${Math.round(topCat[1] / contracts.length * 100)}%) são da categoria ${topCat[0]}. Considerar diversificação.`,
      });
    }

    if (stats.expiring90 > stats.expiring30 * 2) {
      items.push({
        icon: Lightbulb,
        color: 'text-emerald-500',
        bg: 'bg-emerald-500/10',
        title: 'Pico de vencimentos no próximo trimestre',
        description: `${stats.expiring90} contratos vencem em até 90 dias. Planejar recursos adequadamente.`,
      });
    }

    return items.slice(0, 3);
  }, [contracts, stats]);

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