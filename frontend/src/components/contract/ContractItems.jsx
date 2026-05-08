import { cn } from "@/lib/utils";
import { Box, History, Info } from "lucide-react";
import { formatarMoedaBR, formatarDataBR } from "@/utils/formatters";

export default function ContractItems({ contractDetail }) {
  const itens = contractDetail?.itens || [];

  if (itens.length === 0) {
    return (
      <div className="p-10 text-center bg-card border border-border rounded-xl shadow-sm">
        <p className="text-sm text-muted-foreground italic">
          Nenhum item ou serviço detalhado foi identificado para este contrato.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-6 shadow-sm">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Catálogo de Itens e Serviços</h3>
            <p className="text-xs text-muted-foreground">
            Detalhamento de quantidades, valores e evolução histórica.
            </p>
        </div>
        <div className="bg-primary/10 p-2 rounded-lg text-primary">
            <Box className="w-5 h-5" />
        </div>
      </div>

      {/* LISTA */}
      <div className="space-y-4">
        {itens.map((item, idx) => {
          const lastEvent = item?.last_event;
          const isVencendo = lastEvent && lastEvent.data && new Date(lastEvent.data).getFullYear() === new Date().getFullYear();

          return (
            <details
              key={item?.id || idx}
              className="border border-border rounded-2xl p-5 transition-all hover:bg-accent/5 bg-accent/10 group overflow-hidden"
            >
              <summary className="cursor-pointer flex justify-between items-start gap-4 select-none">
                {/* ESQUERDA */}
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-black text-foreground leading-snug group-hover:text-primary transition-colors">
                    {item?.descricao || "Item sem descrição"}
                  </p>

                  <div className="flex gap-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                    <span className="bg-background px-2 py-1 rounded border border-border/50">Qtd: {item?.quantidade || 0}</span>
                    <span className="bg-background px-2 py-1 rounded border border-border/50">{item?.tipo || "N/A"}</span>
                  </div>

                  {lastEvent && (
                    <div className={cn(
                        "text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5",
                        isVencendo ? "text-primary" : "text-muted-foreground/60"
                    )}>
                      <History className="w-3 h-3" />
                      {lastEvent.tipo} em {formatarDataBR(lastEvent.data)}
                    </div>
                  )}
                </div>

                {/* DIREITA */}
                <div className="text-right min-w-[140px]">
                  <p className="text-lg font-black tabular-nums tracking-tighter text-foreground">
                    {formatarMoedaBR(item?.valor_unitario)}
                  </p>
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                    Valor Unitário Atual
                  </p>
                </div>
              </summary>

              {/* DETALHE EXPANDIDO */}
              <div className="mt-6 pt-6 border-t border-border/50 space-y-8 animate-in fade-in duration-300">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <InfoMini label="Grupo Orçamentário" value={item?.grupo} />
                    <InfoMini label="Número do Item" value={item?.numero_item} />
                    <InfoMini label="Código CATMAT/SER" value={item?.id} />
                    <InfoMini label="Unidade Medida" value={item?.tipo} />
                </div>

                {/* HISTÓRICO DO ITEM */}
                {(item?.historico || []).length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <History className="w-3.5 h-3.5 text-muted-foreground" />
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                        Evolução Histórica de Valores
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {item.historico.map((h, i) => (
                        <div
                          key={i}
                          className="flex justify-between items-center text-xs p-4 rounded-xl bg-background border border-border/50 hover:border-primary/30 transition-all shadow-sm"
                        >
                          <div className="space-y-0.5">
                            <p className="font-black text-foreground uppercase tracking-tighter">
                              {h?.tipo_historico || 'Atualização'}
                            </p>
                            <p className="text-[10px] font-bold text-muted-foreground font-mono">
                              {formatarDataBR(h?.data_termo)}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-sm font-black text-foreground tabular-nums">
                              {formatarMoedaBR(h?.valor_unitario)}
                            </p>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase">Unitário</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}

function InfoMini({ label, value }) {
    return (
        <div className="space-y-1">
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <Info className="w-2.5 h-2.5 opacity-50" /> {label}
            </p>
            <p className="text-xs font-black text-foreground truncate bg-accent/20 px-2 py-1 rounded border border-border/50">
                {value || '—'}
            </p>
        </div>
    );
}