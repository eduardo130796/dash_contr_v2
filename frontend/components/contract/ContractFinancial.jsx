import { parseMoney } from "@/utils/money";

export default function ContractFinancial({ contractDetail, financialSummary }) {
  if (!contractDetail?.empenhos) {
    return (
      <p className="text-sm text-muted-foreground">
        Sem dados financeiros.
      </p>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-6">

      {/* ===== KPI PRINCIPAL ===== */}
      <div className="space-y-2">

        <p className="text-xs text-muted-foreground">
          Execução financeira do exercício {financialSummary?.anoAtual}
        </p>

        <div className="flex items-end justify-between">

          <div>
            <p className="text-3xl font-bold">
              {financialSummary.execution.toFixed(0)}%
            </p>

            <div className="text-xs text-muted-foreground mt-1 flex gap-4 flex-wrap">
              <span>
                Pago: <span className="text-foreground font-medium">
                  R$ {financialSummary.pagoAtual.toLocaleString('pt-BR')}
                </span>
              </span>

              <span>
                Empenhado: <span className="text-foreground font-medium">
                  R$ {financialSummary.empenhadoAtual.toLocaleString('pt-BR')}
                </span>
              </span>
            </div>
          </div>

          <span className="text-[10px] text-green-400 bg-green-500/10 px-2 py-1 rounded">
            exercício atual
          </span>

        </div>

        <div className="w-full bg-border h-2 rounded-full overflow-hidden">
          <div
            className="bg-primary h-2"
            style={{ width: `${financialSummary.execution}%` }}
          />
        </div>
      </div>

      {/* ===== ANOS ===== */}
      <div className="space-y-4">

        {Object.entries(
          contractDetail.empenhos.reduce((acc, e) => {
            const ano = e.data_emissao
              ? new Date(e.data_emissao).getFullYear()
              : "Sem data";

            if (!acc[ano]) acc[ano] = [];
            acc[ano].push(e);

            return acc;
          }, {})
        )
          .sort((a, b) => b[0] - a[0])
          .map(([ano, empenhos]) => {

            const totalEmp = empenhos.reduce((acc, e) => acc + parseMoney(e.empenhado), 0);
            const totalPago = empenhos.reduce((acc, e) => acc + parseMoney(e.pago), 0);
            const totalRP = empenhos.reduce((acc, e) => acc + parseMoney(e.rpinscrito), 0);

            const execution = totalEmp > 0 ? (totalPago / totalEmp) * 100 : 0;

            const isAtual = Number(ano) === financialSummary.anoAtual;

            return (
              <details
                key={ano}
                open={isAtual}
                className={`rounded-xl border ${
                  isAtual
                    ? "border-green-500/30 bg-green-500/5"
                    : "border-border"
                }`}
              >
                <summary className="cursor-pointer px-4 py-3 flex items-center justify-between">

                  <div>
                    <p className="text-sm font-semibold">
                      Exercício {ano}
                      {isAtual && (
                        <span className="ml-2 text-[10px] text-green-400">
                          atual
                        </span>
                      )}
                    </p>

                    <div className="text-[11px] text-muted-foreground flex gap-3 flex-wrap">
                      <span>
                        Pago: <span className="text-foreground">
                          R$ {totalPago.toLocaleString('pt-BR')}
                        </span>
                      </span>

                      <span>
                        Emp: <span className="text-foreground">
                          R$ {totalEmp.toLocaleString('pt-BR')}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-semibold">
                      {execution.toFixed(0)}%
                    </p>

                    {totalRP > 0 && (
                      <p className="text-[10px] text-amber-400">
                        RP: R$ {totalRP.toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>

                </summary>

                <div className="px-4">
                  <div className="w-full bg-border h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-1.5"
                      style={{ width: `${execution}%` }}
                    />
                  </div>
                </div>

                {/* EMPENHOS */}
                <div className="px-4 pb-4 mt-3 space-y-2">
                  {empenhos.map((e, i) => (
                    <details key={i} className="border-b border-border pb-2">
                      <summary className="cursor-pointer text-xs flex justify-between">

                        <span className="font-medium">
                          Nota de Empenho {e.numero}
                        </span>

                        <span className="text-muted-foreground">
                          {e.data_emissao
                            ? new Date(e.data_emissao).toLocaleDateString('pt-BR')
                            : '—'}
                        </span>

                      </summary>

                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground flex-wrap">

                        <span>
                          Empenhado: R$ {parseMoney(e.empenhado).toLocaleString('pt-BR')}
                        </span>

                        <span>
                          Pago: R$ {parseMoney(e.pago).toLocaleString('pt-BR')}
                        </span>

                        {parseMoney(e.rpinscrito) > 0 && (
                          <span className="text-amber-400">
                            RP: R$ {parseMoney(e.rpinscrito).toLocaleString('pt-BR')}
                          </span>
                        )}

                      </div>
                    </details>
                  ))}
                </div>

              </details>
            );
          })}

      </div>

    </div>
  );
}