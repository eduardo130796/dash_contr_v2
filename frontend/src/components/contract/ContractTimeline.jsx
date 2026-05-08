import { Loader2 } from "lucide-react";
import { formatarDataBR } from "@/utils/formatters";

export default function ContractTimeline({ contractDetail, loading }) {
  // O backend já envia os eventos processados e ordenados.
  const events = contractDetail?.historico || [];

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
      <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">
        Linha do Tempo Analítica
      </h3>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          Carregando histórico analítico…
        </div>
      ) : events.length === 0 ? (
        <p className="text-sm text-muted-foreground italic p-4">
          Nenhum evento registrado no histórico oficial do contrato.
        </p>
      ) : (
        <div className="relative p-2">
          {/* Linha vertical decorativa */}
          <div className="absolute left-[13.5px] top-2 bottom-2 w-px bg-border lg:left-[13.5px]" />
          
          <div className="space-y-6 relative">
            {events.map((event, i) => (
              <div key={i} className="flex gap-6 group">

                {/* Marcador */}
                <div className="relative z-10 flex-shrink-0">
                  <div className={`w-4 h-4 rounded-full mt-1 border-4 border-background shadow-sm transition-transform group-hover:scale-125
                    ${
                      event.tipo?.toLowerCase().includes("assinatura")
                        ? "bg-primary"
                        : event.tipo?.toLowerCase().includes("aditivo")
                        ? "bg-amber-500"
                        : "bg-muted-foreground/40"
                    }`}
                  />
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-1 mb-1">
                    <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                      {event?.titulo || "Evento"}
                    </p>
                    {event?.data && (
                      <span className="text-[10px] font-mono font-bold text-muted-foreground bg-accent/50 px-2 py-0.5 rounded whitespace-nowrap">
                        {formatarDataBR(event.data)}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {event?.descricao || "Sem descrição registrada."}
                  </p>

                  {event?.ator && (
                    <p className="text-[9px] text-primary/70 font-black mt-2 uppercase tracking-widest">
                      Responsável: {event.ator}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}