

export default function ContractInvoices({ contractDetail }) {
  if (!contractDetail?.faturas) {
    return (
      <p className="text-sm text-muted-foreground">
        Sem dados de faturas.
      </p>
    );
  }

  const hoje = new Date();

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">

      {/* HEADER */}
      <div>
        <h3 className="text-sm font-semibold">Faturas</h3>
        <p className="text-xs text-muted-foreground">
          Controle de faturamento e pagamento
        </p>
      </div>

      {/* LISTA */}
      <div className="space-y-3">

        {[...contractDetail.faturas]
          .sort((a, b) => new Date(b.emissao) - new Date(a.emissao))
          .map((f) => {

            const venc = f.vencimento ? new Date(f.vencimento) : null;
            const atraso = venc && hoje > venc;

            return (
              <details
                key={f.id}
                className="border border-border rounded-lg p-4"
              >
                <summary className="cursor-pointer flex justify-between items-center">

                  {/* ESQUERDA */}
                  <div>
                    <p className="text-sm font-medium">
                      Fatura {f.numero}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      Emissão: {new Date(f.emissao).toLocaleDateString('pt-BR')}
                    </p>
                  </div>

                  {/* DIREITA */}
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      R$ {parseFloat(f.valor).toLocaleString('pt-BR')}
                    </p>

                    <p className={`text-[10px] ${
                      atraso ? "text-red-400" : "text-muted-foreground"
                    }`}>
                      {f.vencimento
                        ? `Venc: ${new Date(f.vencimento).toLocaleDateString('pt-BR')}`
                        : 'Sem vencimento'}
                    </p>
                  </div>

                </summary>

                {/* DETALHE */}
                <div className="mt-3 text-xs text-muted-foreground space-y-2">

                  <div className="flex gap-4 flex-wrap">
                    <span>
                      Situação: <span className="text-foreground">
                        {f.situacao}
                      </span>
                    </span>

                    <span>
                      Tipo: <span className="text-foreground">
                        {f.tipo_instrumento_cobranca}
                      </span>
                    </span>
                  </div>

                  <div className="flex gap-4 flex-wrap">
                    <span>
                      Liquidado em: <span className="text-foreground">
                        {f.data_liquidacao
                          ? new Date(f.data_liquidacao).toLocaleDateString('pt-BR')
                          : '—'}
                      </span>
                    </span>

                    <span>
                      Valor líquido: <span className="text-foreground">
                        R$ {parseFloat(f.valorliquido).toLocaleString('pt-BR')}
                      </span>
                    </span>
                  </div>

                  {/* EMPENHO */}
                  {f.dados_empenho?.[0] && (
                    <div>
                      <span>
                        Empenho vinculado:{" "}
                        <span className="text-foreground font-medium">
                          {f.dados_empenho[0].numero_empenho}
                        </span>
                      </span>
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