import { parseMoney } from "./money";

export function getFinancialSummary(empenhos) {
  if (!empenhos) return null;

  const hoje = new Date();
  const anoAtual = hoje.getFullYear();

  let empenhadoAtual = 0;
  let pagoAtual = 0;

  let empenhadoHistorico = 0;
  let pagoHistorico = 0;

  empenhos.forEach(e => {
    const valorEmp = parseMoney(e.empenhado);
    const valorPago = parseMoney(e.pago);

    const data = e.data_emissao ? new Date(e.data_emissao) : null;

    if (data && data.getFullYear() === anoAtual) {
      empenhadoAtual += valorEmp;
      pagoAtual += valorPago;
    } else {
      empenhadoHistorico += valorEmp;
      pagoHistorico += valorPago;
    }
  });

  const execution = empenhadoAtual > 0
    ? (pagoAtual / empenhadoAtual) * 100
    : 0;

  return {
    anoAtual,
    empenhadoAtual,
    pagoAtual,
    execution,
    empenhadoHistorico,
    pagoHistorico
  };
}