import React from 'react';
import { cn } from '@/lib/utils';
import { getRiskColor, getRiskBgColor } from '@/lib/contractUtils';

export default function RiskScoreBar({ score, showLabel = true, size = 'default' }) {
  const color = getRiskBgColor(score);
  const textColor = getRiskColor(score);
  
  return (
    <div className="flex items-center gap-2">
      <div className={cn("rounded-full bg-muted overflow-hidden", size === 'sm' ? 'w-12 h-1.5' : 'w-20 h-2')}>
        <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${score}%` }} />
      </div>
      {showLabel && <span className={cn("text-xs font-semibold tabular-nums", textColor)}>{score}</span>}
    </div>
  );
}