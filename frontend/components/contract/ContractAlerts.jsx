export default function ContractAlerts({ contract, compact = false }) {
  const analysis = contract?.analysis || {};
  const flags = analysis.flags || [];

  const alerts = [];

  // =========================
  // 🔴 CRÍTICOS
  // =========================

  if (flags.includes("sem_responsavel")) {
    alerts.push({
      level: "critical",
      text: "Contrato sem responsável definido",
    });
  }

  if (flags.includes("sem_garantia")) {
    alerts.push({
      level: "critical",
      text: "Contrato sem garantia",
    });
  }

  if (analysis.status_real === "ativo_sem_execucao") {
    alerts.push({
      level: "critical",
      text: "Contrato ativo sem execução",
    });
  }

  if (analysis.status_real === "vencido_com_execucao_recente") {
    alerts.push({
      level: "critical",
      text: "Execução após vencimento do contrato",
    });
  }

  // =========================
  // 🟡 ATENÇÃO
  // =========================

  if (flags.includes("sem_execucao_no_ano")) {
    alerts.push({
      level: "warning",
      text: "Sem execução no ano atual",
    });
  }

  if (flags.includes("sem_execucao_recente")) {
    alerts.push({
      level: "warning",
      text: "Sem execução recente",
    });
  }

  if (flags.includes("sem_itens")) {
    alerts.push({
      level: "warning",
      text: "Contrato sem itens cadastrados",
    });
  }

  // =========================
  // 📦 ITENS (INTELIGENTE)
  // =========================

  // =========================
  // 🔄 SEM ALERTAS
  // =========================

  if (!alerts.length) return null;

// ordenar
alerts.sort((a, b) => {
  const order = { critical: 0, warning: 1, info: 2 };
  return order[a.level] - order[b.level];
});

// limitar
const visibleAlerts = alerts.slice(0, compact ? 3 : 6);

// 🔥 MODO COMPACTO (overview)
if (compact) {
  return (
    <div className="flex flex-wrap gap-2">
      {visibleAlerts.map((a, i) => (
        <span
          key={i}
          className={`text-[11px] px-2 py-1 rounded ${
            a.level === "critical"
              ? "bg-red-500/10 text-red-400"
              : "bg-amber-500/10 text-amber-400"
          }`}
        >
          {a.text}
        </span>
      ))}
    </div>
  );
}}

// =========================
// 🎨 ITEM VISUAL
// =========================

function AlertItem({ alert }) {
  const styles = {
    critical:
      "bg-red-500/10 border-red-500/20 text-red-400",
    warning:
      "bg-amber-500/10 border-amber-500/20 text-amber-400",
    info:
      "bg-primary/10 border-primary/20 text-primary",
    neutral:
      "bg-muted border-border text-muted-foreground",
  };

  return (
    <div
      className={`px-4 py-2 rounded-lg text-sm border flex items-center justify-between ${styles[alert.level]}`}
    >
      <span>{alert.text}</span>

      {/* opcional: indicador */}
      <span className="text-[10px] opacity-70 uppercase">
        {alert.level}
      </span>
    </div>
  );
}