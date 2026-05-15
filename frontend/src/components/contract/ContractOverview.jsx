import ContractAlerts from "./ContractAlerts";
import { getStatusLabel } from "@/utils/formatters";
import { getHealthColor } from "@/lib/contractUtils";

export default function ContractOverview({ resumo, riscos, alertas, aditivosCount, metadata }) {
  // Verificação de segurança inicial
  if (!resumo) {
    return (
      <div className="p-10 text-center bg-card border border-border rounded-xl">
        <p className="text-sm text-muted-foreground italic">Carregando visão geral analítica...</p>
      </div>
    );
  }

  // Cálculos simples permitidos para visualização
  const daysRemaining = resumo?.dias_restantes;
  const healthScore = riscos?.saude_score || 0;
  const actions = metadata?.recommended_actions || [];
  
  return (
    <div className="space-y-4">

      {/* GRID PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* 🔷 DETALHES */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Detalhes do Contrato</h3>

          <div className="space-y-3 text-xs">
            <Row label="Fornecedor" value={resumo?.fornecedor} />
            <Row label="Categoria" value={resumo?.categoria} />
            <Row label="Unidade" value={resumo?.unidade} />
            <Row label="Situação Real" value={getStatusLabel(resumo?.situacao_real)} />
            <Row label="Estratégico" value={resumo?.is_estrategico ? "Sim" : "Não"} />
            <Row label="Aditivos" value={aditivosCount || 0} />
          </div>
        </div>

        {/* 🔷 DECISÃO */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Suporte à Decisão</h3>


            {/* 🔴 ALERTAS (AGORA COMPACTOS) */}
           <ContractAlerts alerts={alertas} variant="decision" />


            {/* 📊 INDICADORES RÁPIDOS */}
            <div className="grid grid-cols-3 gap-3 text-[10px] pt-4 border-t border-border">
                <div className="space-y-1">
                  <p className="text-muted-foreground uppercase font-bold tracking-tighter">Saúde</p>
                  <p className={cn(
                    "font-black text-sm tabular-nums",
                    getHealthColor(healthScore)
                  )}>{healthScore}%</p>
                </div>

                <div className="space-y-1">
                  <p className="text-muted-foreground uppercase font-bold tracking-tighter">Vencimento</p>
                  <p className={cn(
                    "font-black text-sm tabular-nums",
                    daysRemaining === null ? 'text-foreground' : daysRemaining <= 30 ? 'text-red-500' : 'text-foreground'
                  )}>
                    {daysRemaining !== null && daysRemaining !== undefined ? `${daysRemaining} dias` : "Vencido"}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-muted-foreground uppercase font-bold tracking-tighter">Alertas</p>
                  <p className="font-black text-sm tabular-nums text-foreground">{(alertas || []).length}</p>
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
      <span className="text-muted-foreground font-medium uppercase tracking-tighter" style={{ fontSize: '9px' }}>{label}</span>
      <span className="font-bold text-foreground">
        {value || "—"}
      </span>
    </div>
  );
}

function cn(...inputs) {
  return inputs.filter(Boolean).join(" ");
}