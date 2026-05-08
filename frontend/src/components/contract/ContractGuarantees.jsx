import { parseMoney } from "@/utils/money";
import { cn } from "@/lib/utils";
import { ShieldCheck } from "lucide-react";
import { formatarMoedaBR, formatarDataBR } from "@/utils/formatters";

export default function ContractGuarantees({ contractDetail }) {
  const garantias = contractDetail?.garantias || [];

  if (garantias.length === 0) {
    return (
      <div className="p-10 text-center bg-card border border-border rounded-xl shadow-sm">
        <p className="text-sm text-muted-foreground italic">
          Nenhuma garantia contratual vinculada a este contrato.
        </p>
      </div>
    );
  }

  const hoje = new Date();

  const totalGarantido = garantias.reduce(
    (acc, g) => acc + parseMoney(g?.valor || 0),
    0
  );

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-6 shadow-sm">

      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-border/50 pb-4">
        <div className="space-y-1">
            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Garantias do Contrato</h3>
            <div className="text-[10px] font-bold text-muted-foreground flex gap-4 uppercase tracking-tighter">
                <span>{garantias.length} documento(s) ativo(s)</span>
                <span className="opacity-30">|</span>
                <span>Total: <span className="text-primary font-black">{formatarMoedaBR(totalGarantido)}</span></span>
            </div>
        </div>
        <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-500">
            <ShieldCheck className="w-5 h-5" />
        </div>
      </div>

      {/* LISTA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {garantias.map((g, idx) => {
          const vencimento = g?.vencimento ? new Date(g.vencimento) : null;
          const vencida = vencimento && hoje > vencimento;

          return (
            <div
              key={g?.id || idx}
              className={cn(
                  "border rounded-2xl p-5 flex justify-between items-center transition-all hover:shadow-md bg-accent/5",
                  vencida ? "border-red-500/20 bg-red-500/5" : "border-border"
              )}
            >
              {/* ESQUERDA */}
              <div className="space-y-1">
                <p className="text-sm font-black text-foreground">{g?.tipo || "Garantia"}</p>
                <div className="flex items-center gap-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    Vencimento:{" "}
                    <span className={cn("font-mono", vencida ? "text-red-500" : "text-foreground")}>
                        {formatarDataBR(g?.vencimento, "Indeterminado")}
                    </span>
                    </p>
                </div>
              </div>

              {/* DIREITA */}
              <div className="text-right space-y-2">
                <p className="text-base font-black text-foreground tabular-nums tracking-tighter">
                  {formatarMoedaBR(g?.valor)}
                </p>

                <span
                  className={cn(
                    "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border",
                    vencida
                      ? "bg-red-500/10 text-red-500 border-red-500/20"
                      : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                  )}
                >
                  {vencida ? "Expirada" : "Vigente"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}