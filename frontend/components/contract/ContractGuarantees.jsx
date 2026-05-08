import { parseMoney } from "@/utils/money";

export default function ContractGuarantees({ contractDetail }) {
  const garantias = contractDetail?.garantias;

  if (!garantias || garantias.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <p className="text-sm text-muted-foreground">
          Nenhuma garantia cadastrada.
        </p>
      </div>
    );
  }

  const hoje = new Date();

  const totalGarantido = garantias.reduce(
    (acc, g) => acc + parseMoney(g.valor),
    0
  );

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-5">

      {/* HEADER */}
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">Garantias do contrato</h3>

        <div className="text-xs text-muted-foreground flex gap-4">
          <span>{garantias.length} garantia(s)</span>
          <span>
            Total: R$ {totalGarantido.toLocaleString("pt-BR")}
          </span>
        </div>
      </div>

      {/* LISTA */}
      <div className="space-y-3">

        {garantias.map((g) => {
          const vencimento = g.vencimento
            ? new Date(g.vencimento)
            : null;

          const vencida = vencimento && hoje > vencimento;

          return (
            <div
              key={g.id}
              className="border border-border rounded-lg p-4 flex justify-between items-center"
            >
              {/* ESQUERDA */}
              <div>
                <p className="text-sm font-medium">{g.tipo}</p>

                <p className="text-xs text-muted-foreground">
                  Vencimento:{" "}
                  {vencimento
                    ? vencimento.toLocaleDateString("pt-BR")
                    : "Não informado"}
                </p>
              </div>

              {/* DIREITA */}
              <div className="text-right">
                <p className="text-sm font-semibold">
                  R$ {parseMoney(g.valor).toLocaleString("pt-BR")}
                </p>

                <span
                  className={`text-[10px] px-2 py-1 rounded ${
                    vencida
                      ? "bg-red-500/10 text-red-400"
                      : "bg-green-500/10 text-green-400"
                  }`}
                >
                  {vencida ? "Vencida" : "Vigente"}
                </span>
              </div>
            </div>
          );
        })}

      </div>

    </div>
  );
}