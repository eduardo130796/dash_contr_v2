import { Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";

function classifyEvent(h) {
  const tipo = (h.tipo || "").toUpperCase();

  if (tipo.includes("APOSTILAMENTO")) {
    return { label: "Apostilamento", type: "info", icon: "📄" };
  }

  if (tipo.includes("ADITIVO")) {
    return { label: "Termo Aditivo", type: "neutral", icon: "📑" };
  }

  if (tipo.includes("CONTRATO")) {
    return { label: "Assinatura do contrato", type: "base", icon: "📌" };
  }

  return {
    label: h.tipo || "Evento",
    type: "neutral",
    icon: "•",
  };
}

function buildEvents(historico = []) {
  return historico
    .map((h) => {
      const meta = classifyEvent(h);

      return {
        title: meta.label,
        description: h.observacao || h.descricao || "Sem descrição",
        event_date: h.data_assinatura || h.data,
        type: meta.type,
        icon: meta.icon,
      };
    })
    .sort((a, b) => new Date(b.event_date || 0) - new Date(a.event_date || 0));
}

export default function ContractTimeline({ contractDetail, loading }) {
  const events = buildEvents(contractDetail?.historico || []);

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-semibold mb-4">Linha do Tempo</h3>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Carregando histórico…
        </div>
      ) : events.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum evento registrado.
        </p>
      ) : (
        <div>
          {events.map((event, i) => (
            <div key={i} className="flex gap-4 pb-5 last:pb-0">

              {/* Linha */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-3 h-3 rounded-full mt-1
                    ${
                      event.type === "info"
                        ? "bg-blue-400"
                        : event.type === "base"
                        ? "bg-gray-500"
                        : "bg-gray-400"
                    }`}
                />
                {i < events.length - 1 && (
                  <div className="w-px flex-1 bg-border mt-1" />
                )}
              </div>

              {/* Conteúdo */}
              <div className="flex-1">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <span className="text-xs">{event.icon}</span>
                  {event.title}
                </p>

                <p className="text-xs text-muted-foreground mt-1">
                  {event.description}
                </p>

                {event.event_date && (
                  <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded mt-2 inline-block">
                    {format(parseISO(event.event_date), "dd/MM/yyyy")}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}