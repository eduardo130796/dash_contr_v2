import React, { useMemo } from 'react';
import { useData } from '@/lib/DataContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const urgencyLevels = ['Low', 'Medium', 'High', 'Critical'];
const impactLevels = ['Low', 'Medium', 'High', 'Critical'];

function getCellColor(impact, urgency) {
  const total = impact + urgency;
  if (total >= 5) return 'bg-red-500/30 border-red-500/30';
  if (total >= 3) return 'bg-orange-500/20 border-orange-500/20';
  if (total >= 2) return 'bg-amber-400/15 border-amber-400/20';
  return 'bg-emerald-500/10 border-emerald-500/20';
}

export default function RiskMatrix() {
  const { contracts } = useData();

  const matrix = useMemo(() => {
    const impactMap = { low: 0, medium: 1, high: 2, critical: 3 };
    const urgencyMap = { low: 0, attention: 1, critical: 2, urgent: 3 };
    const grid = Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => []));
    
    contracts.forEach(c => {
      const impact = impactMap[c.operational_impact] ?? 0;
      const urgency = urgencyMap[c.criticality] ?? 0;
      grid[3 - urgency][impact].push(c);
    });
    return grid;
  }, [contracts]);

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Impact × Urgency Matrix</h3>
      <div className="flex">
        <div className="flex flex-col justify-between pr-2 py-1">
          {['Urgent', 'Critical', 'Attention', 'Low'].map(label => (
            <div key={label} className="text-[10px] text-muted-foreground font-medium h-16 flex items-center">{label}</div>
          ))}
        </div>
        <div className="flex-1">
          <div className="grid grid-cols-4 gap-1.5">
            {matrix.flatMap((row, ri) =>
              row.map((cell, ci) => (
                <TooltipProvider key={`${ri}-${ci}`}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className={cn(
                        "h-16 rounded-lg border flex items-center justify-center cursor-default transition-all hover:scale-105",
                        getCellColor(ci, 3 - ri)
                      )}>
                        {cell.length > 0 && (
                          <span className="text-sm font-bold text-foreground">{cell.length}</span>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">{cell.length} contract(s)</p>
                      <p className="text-xs text-muted-foreground">Impact: {impactLevels[ci]} | Urgency: {urgencyLevels[3 - ri]}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))
            )}
          </div>
          <div className="flex justify-between mt-2 px-1">
            {impactLevels.map(label => (
              <div key={label} className="text-[10px] text-muted-foreground font-medium">{label}</div>
            ))}
          </div>
          <div className="text-center mt-1">
            <span className="text-[10px] text-muted-foreground">Impact →</span>
          </div>
        </div>
      </div>
    </div>
  );
}