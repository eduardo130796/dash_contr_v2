import { parseMoney } from "@/utils/money";

function normalizeTipo(tipo) {
  if (!tipo) return "Atualização";

  const t = tipo.toLowerCase();

  if (t.includes("repact")) return "Repactuação";
  if (t.includes("apostil")) return "Reajuste";
  if (t.includes("aditivo")) return "Aditivo";

  return tipo;
}

function getLastEvent(item) {
  const historico = item.historico_item || [];

  if (!historico.length) return null;

  const sorted = [...historico].sort(
    (a, b) => new Date(b.data_termo) - new Date(a.data_termo)
  );

  const last = sorted[0];

  if (!last?.data_termo) return null;

  const date = new Date(last.data_termo);
  const currentYear = new Date().getFullYear();

  return {
    type: normalizeTipo(last.tipo_historico),
    date,
    isCurrentYear: date.getFullYear() === currentYear,
  };
}

function truncate(text, max = 110) {
  if (!text) return "Item";
  if (text.length <= max) return text;
  return text.slice(0, max) + "...";
}

export default function ContractItems({ contractDetail }) {
  const itens = contractDetail?.itens;

  if (!itens || itens.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <p className="text-sm text-muted-foreground">
          Nenhum item cadastrado.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-5">

      {/* HEADER */}
      <div>
        <h3 className="text-sm font-semibold">Itens do contrato</h3>
        <p className="text-xs text-muted-foreground">
          Composição e evolução dos valores contratados
        </p>
      </div>

      {/* LISTA */}
      <div className="space-y-3">

        {itens.map((item) => {
          const descricao =
            item.descricao_complementar ||
            item.catmatseritem_id ||
            "Item";

          const valorAtual = parseMoney(item.valorunitario);
          const lastEvent = getLastEvent(item);

          return (
            <details
              key={item.id}
              className="border border-border rounded-lg p-4"
            >
              <summary className="cursor-pointer flex justify-between items-start gap-4">

                {/* ESQUERDA */}
                <div className="flex-1 space-y-1">

                  {/* DESCRIÇÃO */}
                  <p className="text-sm font-medium">
                    {truncate(descricao)}
                  </p>

                  {/* META */}
                  <div className="flex gap-3 text-[11px] text-muted-foreground flex-wrap">
                    <span>Qtd: {item.quantidade}</span>
                    <span>{item.tipo_id}</span>
                  </div>

                  {/* EVENTO */}
                  {lastEvent && (
                    <div
                      className={`text-[11px] ${
                        lastEvent.isCurrentYear
                          ? "text-primary font-medium"
                          : "text-muted-foreground"
                      }`}
                    >
                      {lastEvent.type} em{" "}
                      {lastEvent.date.toLocaleDateString("pt-BR")}
                    </div>
                  )}

                </div>

                {/* DIREITA */}
                <div className="text-right min-w-[110px]">
                  <p className="text-sm font-semibold">
                    R$ {valorAtual.toLocaleString("pt-BR")}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    unitário
                  </p>
                </div>

              </summary>

              {/* DETALHE */}
              <div className="mt-4 space-y-4">

                {/* INFO */}
                <div className="text-xs text-muted-foreground flex gap-4 flex-wrap">
                  <span>Grupo: {item.grupo_id}</span>
                  <span>Item: {item.numero_item_compra}</span>
                </div>

                {/* HISTÓRICO */}
                {item.historico_item?.length > 0 && (
                  <div className="space-y-2">

                    <p className="text-xs text-muted-foreground">
                      Evolução do valor
                    </p>

                    {[...item.historico_item]
                      .sort((a, b) => new Date(b.data_termo) - new Date(a.data_termo))
                      .map((h, i) => {
                        const valor = parseMoney(h.valor_unitario);

                        return (
                          <div
                            key={i}
                            className="flex justify-between text-xs border-b border-border pb-2"
                          >
                            <div>
                              <p className="text-foreground">
                                {normalizeTipo(h.tipo_historico)}
                              </p>
                              <p className="text-muted-foreground">
                                {new Date(h.data_termo).toLocaleDateString("pt-BR")}
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-foreground">
                                R$ {valor.toLocaleString("pt-BR")}
                              </p>
                            </div>
                          </div>
                        );
                      })}

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