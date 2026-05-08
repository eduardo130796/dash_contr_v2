import React from 'react';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown } from 'lucide-react';

export default function KPICard({ title, value, subtitle, icon: Icon, trend, trendLabel, variant = 'default', className, onClick }) {
  const variants = {
    default: 'border-border',
    primary: 'border-primary/20',
    warning: 'border-amber-400/20',
    danger: 'border-red-500/20',
    success: 'border-emerald-500/20',
  };

  return (
    <div
      className={cn(
        "bg-card border rounded-xl p-5 transition-all duration-200 hover:shadow-md",
        variants[variant],
        onClick && "cursor-pointer hover:border-primary/40",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
        {Icon && (
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            variant === 'danger' ? 'bg-red-500/10' : variant === 'warning' ? 'bg-amber-400/10' : variant === 'success' ? 'bg-emerald-500/10' : 'bg-primary/10'
          )}>
            <Icon className={cn(
              "w-4 h-4",
              variant === 'danger' ? 'text-red-500' : variant === 'warning' ? 'text-amber-400' : variant === 'success' ? 'text-emerald-500' : 'text-primary'
            )} />
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
      {(subtitle || trend) && (
        <div className="flex items-center gap-2 mt-1.5">
          {trend && (
            <span className={cn(
              "flex items-center gap-0.5 text-xs font-medium",
              trend > 0 ? "text-emerald-500" : "text-red-500"
            )}>
              {trend > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
              {Math.abs(trend)}%
            </span>
          )}
          {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}