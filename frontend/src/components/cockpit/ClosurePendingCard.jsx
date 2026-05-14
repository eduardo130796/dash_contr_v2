import React from 'react';

export default function ClosurePendingCard({ data }) {

  const closurePending = data || {
    total: 0,
    critical: 0,
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 h-full">

      <div className="flex items-start justify-between mb-5">

        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Pendências de Encerramento
          </h3>

          <p className="text-xs text-muted-foreground mt-1">
            Contratos vencidos ainda ativos no sistema
          </p>
        </div>

        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse mt-1" />
      </div>

      <div className="space-y-5">

        <div>
          <p className="text-4xl font-black text-red-500 tabular-nums tracking-tight">
            {closurePending.total}
          </p>

          <p className="text-xs text-muted-foreground mt-1">
            pendências identificadas
          </p>
        </div>

        <div className="border-t border-border/50 pt-4 space-y-3">

          <div className="flex items-center justify-between">

            <span className="text-xs text-muted-foreground">
              Acima de 90 dias
            </span>

            <span className="text-sm font-black text-orange-500 tabular-nums">
              {closurePending.critical}
            </span>
          </div>

          <div className="flex items-center justify-between">

            <span className="text-xs text-muted-foreground">
              Necessitam regularização
            </span>

            <span className="text-sm font-bold text-foreground">
              {closurePending.total > 0 ? 'Sim' : 'Não'}
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}