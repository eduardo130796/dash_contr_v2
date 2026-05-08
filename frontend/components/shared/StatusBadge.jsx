import React from 'react';
import { cn } from '@/lib/utils';
import { getStatusConfig, getCriticalityConfig, getSeverityBg } from '@/lib/contractUtils';

export function StatusBadge({ status }) {
  const config = getStatusConfig(status);
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border", config.bg)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", config.color.replace('text-', 'bg-'))} />
      {config.label}
    </span>
  );
}

export function CriticalityBadge({ criticality }) {
  const config = getCriticalityConfig(criticality);
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border", config.bg)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}

export function SeverityBadge({ severity }) {
  const bg = getSeverityBg(severity);
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border uppercase", bg)}>
      {severity}
    </span>
  );
}