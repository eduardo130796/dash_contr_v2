import { formatarMoedaBR, formatarDataBR } from "@/utils/formatters";

export default function ContractInvoices({ contractDetail }) {
  // Recebe as faturas já processadas (ou tenta usar o fallback do contractDetail)
  const faturas = contractDetail?.faturas || [];

  if (faturas.length === 0) {
    return (
      <div className="p-10 text-center bg-card border border-border rounded-xl">
        <p className="text-sm text-muted-foreground italic">
          Nenhuma fatura registrada para este contrato.
        </p>
      </div>
    );
  }

  const hoje = new Date();

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-sm">
      {/* HEADER */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-widest">Controle de Faturamento</h3>
        <p className="text-xs text-muted-foreground">
          Monitoramento de notas fiscais, liquidações e pagamentos.
        </p>
      </div>

      {/* LISTA */}
      <div className="space-y-3">
        {faturas.map((f, idx) => {
            const venc = f.vencimento ? new Date(f.vencimento) : null;
            const atraso = venc && hoje > venc && !f.data_liquidacao;

            return (
              <details
                key={f.id || idx}
                className={`border rounded-xl p-4 transition-all hover:bg-accent/5 ${atraso ? 'border-red-500/30 bg-red-500/5' : 'border-border bg-accent/20'}`}
              >
                <summary className="cursor-pointer flex justify-between items-center select-none">
                  {/* ESQUERDA */}
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded flex items-center justify-center font-bold text-[10px] ${atraso ? 'bg-red-500 text-white' : 'bg-primary/20 text-primary'}`}>
                        NF
                    </div>
                    <div>
                        <p className="text-sm font-bold">
                        {f.numero}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase font-medium">
                        Emissão: {formatarDataBR(f.emissao)}
                        </p>
                    </div>
                  </div>

                  {/* DIREITA */}
                  <div className="text-right">
                    <p className="text-sm font-black tabular-nums">
                      {formatarMoedaBR(f.valor)}
                    </p>
                    <p className={`text-[10px] font-bold uppercase ${atraso ? "text-red-500" : "text-muted-foreground"}`}>
                      {f.vencimento
                        ? `Venc: ${formatarDataBR(f.vencimento)}`
                        : 'Sem vencimento'}
                    </p>
                  </div>
                </summary>

                {/* DETALHE */}
                <div className="mt-4 pt-4 border-t border-border/50 text-xs text-muted-foreground space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <p className="uppercase text-[9px] font-bold opacity-70">Situação</p>
                        <p className="text-foreground font-medium">{f.situacao || '—'}</p>
                    </div>
                    <div className="space-y-1 text-right">
                        <p className="uppercase text-[9px] font-bold opacity-70">Tipo</p>
                        <p className="text-foreground font-medium">{f.tipo_instrumento_cobranca || '—'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <p className="uppercase text-[9px] font-bold opacity-70">Liquidação</p>
                        <p className="text-foreground font-medium">
                            {formatarDataBR(f.data_liquidacao, 'Pendente')}
                        </p>
                    </div>
                    <div className="space-y-1 text-right">
                        <p className="uppercase text-[9px] font-bold opacity-70">Valor Líquido</p>
                        <p className="text-foreground font-bold font-mono">
                            {formatarMoedaBR(f.valorliquido)}
                        </p>
                    </div>
                  </div>

                  {/* EMPENHO */}
                  {f.dados_empenho?.[0] && (
                    <div className="bg-primary/5 p-2 rounded border border-primary/10">
                      <p className="text-[9px] uppercase font-bold text-primary mb-0.5">Empenho Vinculado</p>
                      <p className="text-foreground font-mono text-[11px]">
                        {f.dados_empenho[0].numero_empenho}
                      </p>
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