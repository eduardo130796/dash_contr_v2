import React from 'react';
import { useData } from '@/lib/DataContext';
import { getDaysRemaining, formatCurrency, formatCompactCurrency, getCriticalityConfig, getStatusConfig, getRiskColor } from '@/lib/contractUtils';
import { StatusBadge, CriticalityBadge } from '@/components/shared/StatusBadge';
import RiskScoreBar from '@/components/shared/RiskScoreBar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Building2, Calendar, User, DollarSign, Shield, Loader2 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useState, useEffect, useMemo } from 'react';
import ContractInvoices from "@/components/contract/ContractInvoices";
import ContractFinancial from "@/components/contract/ContractFinancial";
import { getFinancialSummary } from "@/utils/contract";
import ContractResponsibles from "@/components/contract/ContractResponsibles";
import ContractGuarantees from "@/components/contract/ContractGuarantees";
import ContractItems from "@/components/contract/ContractItems";
import ContractTimeline from "@/components/contract/ContractTimeline";
import ContractOverview from "@/components/contract/ContractOverview";

const API = import.meta.env.VITE_API_URL || "https://solid-space-funicular-qx5xr6qvw56h4476-8000.app.github.dev";

export default function Contract360() {
  const { contracts } = useData();
  const { id } = useParams();
  const [contractDetail, setContractDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    loadDetail();

    async function loadDetail() {
      try {
        setLoadingDetail(true);

        const res = await fetch(`${API}/api/contracts/${id}`, {
          credentials: "include",
        });

        const data = await res.json();

        setContractDetail(data);
      } catch (e) {
        console.error("Erro ao carregar detalhe:", e);
      } finally {
        setLoadingDetail(false);
      }
    }
  }, [id]);

  const contract = contracts.find(
    c => String(c.id) === String(id)
  );
  const contractFinal = {
    ...contract,        // base (funciona)
    ...contractDetail,  // complementa (detalhes)
  };

  const { amendments, events, alerts: allAlerts } = useData();
  const contractAmendments = amendments.filter(a => String(a.contract_id) === String(id));
  

  const financialSummary = useMemo(() => {
    return getFinancialSummary(contractDetail?.empenhos);
  }, [contractDetail]);

  const contractAlerts     = allAlerts.filter(a => String(a.contract_id) === String(id));

  if (!contract && !loadingDetail) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Contrato não encontrado.</p>
        <Link to="/contracts" className="text-primary text-sm hover:underline">Voltar aos contratos</Link>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="p-6 flex items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Carregando dados do contrato…</span>
      </div>
    );
  }

  const days        = getDaysRemaining(contractFinal.end_date);
  const healthScore = Math.max(0, 100 - (contractFinal.risk_score || 0));
  const financial   = null;
  const scope       = [];


  
  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div>
        <Link to="/contracts" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="w-4 h-4" /> Voltar aos Contratos
        </Link>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-foreground">{contract.contract_number}</h1>
              <StatusBadge status={contract.analysis?.status_real} />
              <CriticalityBadge criticality={contract.criticality} />
              {loadingDetail && <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />}
            </div>
            <p className="text-sm text-muted-foreground">{contract.object}</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className={cn("text-3xl font-bold tabular-nums", healthScore >= 60 ? 'text-emerald-500' : healthScore >= 40 ? 'text-amber-400' : 'text-red-500')}>
                {healthScore}
              </div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Saúde</div>
            </div>
            <div className="text-center">
...
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Dias Restantes</div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <InfoCard icon={Building2} label="Fornecedor" value={contract.contractor} />
        <InfoCard icon={User}      label="Gestor"    value={contract.manager !== '—' ? contract.manager : (loadingDetail ? '…' : '—')} />
        <InfoCard icon={DollarSign} label="Valor"     value={formatCurrency(contract.value)} />
        <InfoCard icon={Calendar}  label="Início"      value={contract.start_date ? format(parseISO(contract.start_date), 'dd/MM/yyyy') : '—'} />
        <InfoCard icon={Calendar}  label="Fim"        value={contractFinal.end_date   ? format(parseISO(contractFinal.end_date),   'dd/MM/yyyy') : '—'} />
        <InfoCard icon={Shield}    label="Pontuação de Risco" value={`${contract.risk_score}/100`} />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-accent/50">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="timeline">Histórico</TabsTrigger>
          <TabsTrigger value="financial">Empenhos</TabsTrigger>
          <TabsTrigger value="invoices">Faturas</TabsTrigger>
          <TabsTrigger value="responsibles">Responsáveis</TabsTrigger>
          <TabsTrigger value="guarantees">Garantia</TabsTrigger>
          <TabsTrigger value="items">Itens</TabsTrigger>
          <TabsTrigger value="risks">Riscos</TabsTrigger>
          <TabsTrigger value="amendments">Aditivos</TabsTrigger>
          <TabsTrigger value="actions">Ações</TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW ── */}
        <TabsContent value="overview" className="mt-4">
          <ContractOverview contract={contractFinal} />
        </TabsContent>

        {/* ── TIMELINE ── */}
        <TabsContent value="timeline" className="mt-4">
          <ContractTimeline
            contractDetail={contractDetail}
            loading={loadingDetail}
          />
        </TabsContent>

        <TabsContent value="financial">
          <ContractFinancial
            contractDetail={contractDetail}
            financialSummary={financialSummary}
          />
        </TabsContent>

        <TabsContent value="invoices">
          <ContractInvoices contractDetail={contractDetail} />
        </TabsContent>

        <TabsContent value="responsibles">
          <ContractResponsibles contractDetail={contractDetail} />
        </TabsContent>

        <TabsContent value="guarantees">
          <ContractGuarantees contractDetail={contractDetail} />
        </TabsContent>

        <TabsContent value="items">
      <ContractItems contractDetail={contractDetail} />
    </TabsContent>

        {/* ── RISKS ── */}
        <TabsContent value="risks" className="mt-4">
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold">Avaliação de Risco</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <RiskFactorCard label="Proximidade do Vencimento" value={days !== null && days <= 30 ? 'Alto' : days !== null && days <= 90 ? 'Médio' : 'Baixo'} />
              <RiskFactorCard label="Impacto Operacional"   value={contract.operational_impact} />
              <RiskFactorCard label="Risco de Continuidade"      value={contract.continuity_risk} />
              <RiskFactorCard label="Histórico de Aditivos"    value={contract.amendments_count > 3 ? 'Elevado' : 'Normal'} />
            </div>
            {contractAlerts.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Alertas Ativos</h4>
                {contractAlerts.map((alert, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-accent/30 mb-1.5">
                    <span className={cn("w-2 h-2 rounded-full shrink-0",
                      alert.severity === 'red'    ? 'bg-red-500' :
                      alert.severity === 'orange' ? 'bg-orange-500' : 'bg-amber-400'
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">{alert.title}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{alert.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── AMENDMENTS ── */}
        <TabsContent value="amendments" className="mt-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-4">Histórico de Aditivos ({contractAmendments.length})</h3>
            {loadingDetail && contractAmendments.length === 0 ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Carregando aditivos…
              </div>
            ) : contractAmendments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum aditivo registrado.</p>
            ) : (
              <div className="space-y-2">
                {contractAmendments.map((amd, i) => (
                  <div key={i} className="p-3 rounded-lg border border-border bg-accent/20">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-medium">{amd.amendment_number}</span>
                      <Badge variant="secondary" className="text-[10px] capitalize">{amd.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{amd.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                      <span>Tipo: {amd.type}</span>
                      {amd.effective_date && (
                        <span>Data: {format(parseISO(amd.effective_date), 'dd/MM/yyyy')}</span>
                      )}
                      {amd.value_change !== 0 && <span>Variação: {formatCurrency(amd.value_change)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── ACTIONS ── */}
        <TabsContent value="actions" className="mt-4">
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold">Ações Recomendadas</h3>
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
              <p className="text-sm text-foreground">{contract.recommended_action}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ActionCard title="Revisar Contrato"           description="Agendar análise abrangente com o gestor do contrato e as partes interessadas." />
              <ActionCard title="Avaliar Opções de Renovação" description="Avaliar renovação versus nova licitação com base nas condições atuais do mercado." />
              <ActionCard title="Mitigação de Risco"         description="Implementar estratégias de mitigação com base na avaliação de risco atual." />
              <ActionCard title="Verificação de Conformidade" description="Verificar todos os requisitos de conformidade e obrigações regulatórias." />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Sub-components (unchanged signatures) ────────────────────────────────────
function InfoCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-card border border-border rounded-xl p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <p className="text-sm font-medium text-foreground truncate">{value}</p>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-foreground capitalize">{typeof value === 'string' ? value : value}</span>
    </div>
  );
}

function RiskFactorCard({ label, value }) {
  const isHigh = ['high', 'critical', 'Elevated', 'High'].includes(value);
  return (
    <div className={cn("p-3 rounded-lg border", isHigh ? 'bg-red-500/5 border-red-500/20' : 'bg-accent/30 border-border')}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("text-sm font-semibold mt-0.5 capitalize", isHigh ? 'text-red-500' : 'text-foreground')}>{value}</p>
    </div>
  );
}

function ActionCard({ title, description }) {
  return (
    <div className="p-3 rounded-lg border border-border bg-accent/20 hover:bg-accent/40 transition-colors cursor-pointer">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
    </div>
  );
}