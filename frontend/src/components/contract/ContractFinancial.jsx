import { cn } from "@/lib/utils";
import { formatarMoedaBR, formatarDataBR, formatarDecimalBR } from "@/utils/formatters";

export default function ContractFinancial({ financialSummary, contractDetail }) {
  // Verificação de segurança
  const totalPago = financialSummary?.total_pago || 0;
  const totalEmpenhado = financialSummary?.total_empenhado || 0;
  const execucaoGlobal = financialSummary?.execucao_global || 0;
  const anoAtual = financialSummary?.ano_atual;
  const exercicios = financialSummary?.exercicios || [];

  if (!financialSummary || exercicios.length === 0) {
    return (
      <div className="p-10 text-center bg-card border border-border rounded-xl shadow-sm">
        <p className="text-sm text-muted-foreground italic">
          Nenhuma execução financeira registrada para este contrato até o momento.
        </p>
      </div>
    );
  }

  const dadosAnoAtual = exercicios.find(e => e.ano === anoAtual) || {};

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-8 shadow-sm">

      {/* ===== KPI PRINCIPAL ===== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                Execução Financeira {anoAtual ? `— Exercício ${anoAtual}` : ''}
            </h3>
            <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full uppercase tracking-widest border border-emerald-500/20">
                Sincronizado
            </span>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <p className="text-5xl font-black tabular-nums tracking-tighter text-foreground">
              {formatarDecimalBR(dadosAnoAtual.execucao || execucaoGlobal, 1)}%
            </p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Percentual de Liquidação</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 min-w-[300px]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Pago</p>
                </div>
                <p className="text-lg font-black text-foreground tabular-nums">
                  {formatarMoedaBR(dadosAnoAtual.pago || totalPago)}
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Empenhado</p>
                </div>
                <p className="text-lg font-black text-foreground tabular-nums">
                  {formatarMoedaBR(dadosAnoAtual.empenhado || totalEmpenhado)}
                </p>
              </div>
          </div>
        </div>

        <div className="w-full bg-accent/30 h-3 rounded-full overflow-hidden border border-border/50 relative shadow-inner">
          <div
            className="bg-primary h-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(var(--primary),0.3)]"
            style={{ width: `${dadosAnoAtual.execucao || execucaoGlobal}%` }}
          />
        </div>
      </div>

      {/* ===== LISTA DE EXERCÍCIOS ===== */}
      <div className="space-y-4">
        <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pt-4 border-t border-border">Histórico Fiscal Detalhado</h4>
        
        <div className="grid grid-cols-1 gap-3">
            {exercicios.map((ex) => {
                const isAtual = ex.ano === anoAtual;

                return (
                <details
                    key={ex.ano}
                    open={isAtual}
                    className={cn(
                        "rounded-xl border transition-all duration-200 group overflow-hidden",
                        isAtual ? "border-primary/40 bg-primary/5 shadow-sm" : "border-border bg-accent/10 hover:bg-accent/20"
                    )}
                >
                    <summary className="cursor-pointer px-5 py-5 flex items-center justify-between select-none">
                    <div className="flex items-center gap-5">
                        <div className={cn(
                            "w-12 h-12 rounded-xl flex flex-col items-center justify-center font-black",
                            isAtual ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground"
                        )}>
                            <span className="text-[9px] leading-none opacity-70 uppercase">Ano</span>
                            <span className="text-sm">{ex.ano}</span>
                        </div>

                        <div>
                        <p className="text-sm font-bold flex items-center gap-2">
                            Exercício Fiscal {ex.ano}
                            {isAtual && (
                            <span className="text-[9px] bg-primary/20 text-primary px-2 py-0.5 rounded-full uppercase font-black tracking-tighter">atual</span>
                            )}
                        </p>

                        <div className="text-[10px] font-bold text-muted-foreground flex gap-4 mt-1 uppercase tracking-tighter">
                            <span>Pago: <span className="text-foreground">{formatarMoedaBR(ex.pago)}</span></span>
                            <span className="opacity-30">|</span>
                            <span>Empenhado: <span className="text-foreground">{formatarMoedaBR(ex.empenhado)}</span></span>
                        </div>
                        </div>
                    </div>

                    <div className="text-right">
                        <p className="text-2xl font-black tabular-nums tracking-tighter">
                        {formatarDecimalBR(ex.execucao || 0, 1)}%
                        </p>
                        {ex.rp > 0 && (
                        <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">
                            Restos a Pagar: {formatarMoedaBR(ex.rp)}
                        </p>
                        )}
                    </div>
                    </summary>

                    <div className="px-5 pb-5">
                        <div className="w-full bg-accent/50 h-2 rounded-full overflow-hidden mb-6">
                            <div
                            className="bg-primary/60 h-full"
                            style={{ width: `${ex.execucao}%` }}
                            />
                        </div>

                        {/* NOTAS DE EMPENHO */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {(ex.itens || []).map((item, idx) => (
                            <div key={idx} className="p-4 rounded-xl border border-border/50 bg-background/50 flex flex-col justify-between gap-3 hover:border-primary/30 transition-all group/item">
                                <div className="space-y-1">
                                    <p className="text-xs font-black text-foreground uppercase tracking-widest flex items-center justify-between">
                                        NE {item?.numero || '—'}
                                        <span className="text-[9px] font-bold text-muted-foreground opacity-0 group-hover/item:opacity-100 transition-opacity">
                                            {item?.data_emissao ? new Date(item.data_emissao).toLocaleDateString('pt-BR') : ''}
                                        </span>
                                    </p>
                                    <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                                        {item?.finalidade || 'Finalidade não detalhada no empenho.'}
                                    </p>
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-border/30">
                                    <div className="space-y-0.5">
                                        <p className="text-[9px] text-muted-foreground uppercase font-black tracking-tighter">Valor Liquidado</p>
                                        <p className="text-xs font-black text-foreground tabular-nums">{formatarMoedaBR(item?.pago)}</p>
                                    </div>
                                    <div className="text-right space-y-0.5">
                                        <p className="text-[9px] text-muted-foreground uppercase font-black tracking-tighter">Valor Empenhado</p>
                                        <p className="text-xs font-black text-primary/80 tabular-nums">{formatarMoedaBR(item?.empenhado)}</p>
                                    </div>
                                    <div className="text-right border-l border-border pl-4">
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Emissão</p>
                                        <p className="text-xs font-mono">{formatarDataBR(item?.data_emissao)}</p>
                                    </div>
                                </div>
                            </div>
                            ))}
                        </div>
                    </div>
                </details>
                );
            })}
        </div>
      </div>
    </div>
  );
}