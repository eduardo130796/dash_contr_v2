import ContractAlerts from "./ContractAlerts";
import RiskScoreBar from "@/components/shared/RiskScoreBar";

export default function ContractOverview({ contract }) {
  if (!contract) {
    return (
      <div className="text-sm text-muted-foreground">
        Carregando dados do contrato...
      </div>
    );
  }

  const analysis = contract.analysis || {};

  const daysRemaining = contract.end_date
    ? Math.ceil(
        (new Date(contract.end_date) - new Date()) / (1000 * 60 * 60 * 24)
      )
    : null;

  const healthScore = 100 - (contract.risk_score || 0);

  const actions = contract.analysis?.recommended_actions || [];
  
  return (
    <div className="space-y-4">

      {/* GRID PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* 🔷 DETALHES */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold">Detalhes do Contrato</h3>

          <div className="space-y-3 text-xs">

            <Row label="Categoria" value={contract.category} />
            <Row label="Unidade" value={contract.unit} />
            <Row label="Modalidade" value={contract.modality} />
            <Row label="Processo" value={contract.process_number} />

            <Row label="Situação Real" value={analysis.status_real} />

            <Row label="Estratégico" value={contract.is_strategic ? "Sim" : "Não"} />
            <Row label="Aditivos" value={contract.amendments_count} />

          </div>
        </div>

        {/* 🔷 DECISÃO */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold">Suporte à Decisão</h3>

            {/* 🔥 RESUMO (STATUS) */}
            <div className="text-sm font-medium">
                {analysis.status_real === "ativo_sem_execucao" && (
                <span className="text-red-400">
                    Contrato ativo sem execução
                </span>
                )}
            </div>

            {/* 🔴 ALERTAS (AGORA COMPACTOS) */}
           <ContractAlerts contract={contract} compact />

            {/* 🔵 AÇÃO */}
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                <p className="text-xs text-primary mb-2">Ações recomendadas</p>

                {actions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                    Nenhuma ação necessária
                    </p>
                ) : (
                    <ul className="text-sm space-y-1">
                    {actions.map((a, i) => (
                        <li key={i} className="flex gap-2">
                        <span className="text-primary">•</span>
                        <span>{a}</span>
                        </li>
                    ))}
                    </ul>
                )}
                </div>

            {/* 📊 INDICADORES */}
            <div className="grid grid-cols-3 gap-3 text-xs pt-2 border-t border-border">

                <div>
                <p className="text-muted-foreground">Saúde</p>
                <p className="font-semibold">{healthScore}</p>
                </div>

                <div>
                <p className="text-muted-foreground">Vencimento</p>
                <p className="font-semibold">
                    {daysRemaining > 0 ? `${daysRemaining} dias` : "Vencido"}
                </p>
                </div>

                <div>
                <p className="text-muted-foreground">Alertas</p>
                <p className="font-semibold">{(contract.analysis?.flags || []).length}</p>
                </div>

            </div>
            </div>

      </div>

    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">
        {value || "—"}
      </span>
    </div>
  );
}