import { cn } from "@/lib/utils";

export default function ContractAlerts({ alerts = [], compact = false }) {
  // O backend agora envia o array de alertas já processados e classificados.
  // Schema AlertaSchema: { id, tipo, titulo, descricao, severidade, data }
  
  if (!alerts || alerts.length === 0) return null;

  // Ordenar: crítico (red) -> atenção (orange) -> informativo (amber/blue)
  const sortedAlerts = [...alerts].sort((a, b) => {
    const priority = { red: 0, orange: 1, amber: 2, blue: 3 };
    return (priority[a.severidade] ?? 99) - (priority[b.severidade] ?? 99);
  });

  const visibleAlerts = compact ? sortedAlerts.slice(0, 3) : sortedAlerts;

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2 py-1">
        {visibleAlerts.map((a, i) => (
          <span
            key={a.id || i}
            className={cn(
                "text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-tighter border transition-all",
                a.severidade === "red" ? "bg-red-500/10 text-red-500 border-red-500/20" : 
                a.severidade === "orange" ? "bg-orange-500/10 text-orange-500 border-orange-500/20" : 
                "bg-primary/10 text-primary border-primary/20"
            )}
            title={a.descricao}
          >
            {a.titulo}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {visibleAlerts.map((a, i) => (
        <AlertItem key={a.id || i} alert={a} />
      ))}
    </div>
  );
}

function AlertItem({ alert }) {
  const styles = {
    red: "bg-red-500/5 border-red-500/20 text-red-600 shadow-[0_2px_10px_rgba(239,68,68,0.05)]",
    orange: "bg-orange-500/5 border-orange-500/20 text-orange-600",
    amber: "bg-amber-500/5 border-amber-500/20 text-amber-600",
    blue: "bg-primary/5 border-primary/20 text-primary",
  };

  const levelLabels = {
    red: "Crítico",
    orange: "Atenção",
    amber: "Aviso",
    blue: "Informativo"
  };

  return (
    <div className={cn(
        "px-4 py-4 rounded-xl text-xs border flex items-start justify-between gap-4 transition-all hover:scale-[1.01] hover:shadow-md", 
        styles[alert.severidade] || styles.blue
    )}>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
            <span className={cn(
                "w-1.5 h-1.5 rounded-full animate-pulse",
                alert.severidade === 'red' ? 'bg-red-500' : alert.severidade === 'orange' ? 'bg-orange-500' : 'bg-primary'
            )} />
            <p className="font-black uppercase tracking-widest text-[10px]">{alert?.titulo || "Alerta"}</p>
        </div>
        <p className="font-medium leading-relaxed opacity-90">{alert?.descricao || "Sem detalhes adicionais."}</p>
      </div>
      
      <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
        <span className="text-[8px] font-black uppercase opacity-60 bg-current/10 px-2 py-0.5 rounded-full tracking-tighter">
            {levelLabels[alert.severidade] || "Info"}
        </span>
        {alert.data && (
            <span className="text-[8px] opacity-40 font-mono">{new Date(alert.data).toLocaleDateString('pt-BR')}</span>
        )}
      </div>
    </div>
  );
}