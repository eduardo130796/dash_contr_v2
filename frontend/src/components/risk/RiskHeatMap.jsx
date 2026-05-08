import React, { useMemo } from 'react';
import { useData } from '@/lib/DataContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export default function RiskHeatMap() {
  const { contracts } = useData();

  const heatData = useMemo(() => {
    const byCategory = {};
    contracts.forEach(c => {
      if (!byCategory[c.category]) byCategory[c.category] = { total: 0, riskSum: 0, count: 0 };
      byCategory[c.category].total++;
      byCategory[c.category].riskSum += (c.risk_score || 0);
      byCategory[c.category].count++;
    });
    return Object.entries(byCategory).map(([cat, data]) => ({
      category: cat,
      avgRisk: Math.round(data.riskSum / data.count),
      count: data.count,
    })).sort((a, b) => b.avgRisk - a.avgRisk);
  }, [contracts]);

  function getHeatColor(risk) {
    if (risk >= 60) return 'bg-red-500/60';
    if (risk >= 40) return 'bg-orange-500/50';
    if (risk >= 25) return 'bg-amber-400/40';
    return 'bg-emerald-500/30';
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Risk Heat Map by Category</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <TooltipProvider>
          {heatData.map(item => (
            <Tooltip key={item.category}>
              <TooltipTrigger asChild>
                <div className={cn(
                  "rounded-lg p-3 border border-border/50 cursor-default transition-transform hover:scale-105",
                  getHeatColor(item.avgRisk)
                )}>
                  <p className="text-xs font-medium text-foreground capitalize">{item.category}</p>
                  <p className="text-lg font-bold text-foreground mt-1">{item.avgRisk}</p>
                  <p className="text-[10px] text-foreground/60">{item.count} contracts</p>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Avg Risk: {item.avgRisk}/100</p>
                <p>{item.count} contracts in {item.category}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </div>
    </div>
  );
}