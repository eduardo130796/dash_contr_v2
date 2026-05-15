import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData } from '@/lib/DataContext';
import { formatarDataBR, formatarDataHoraBR, formatarMoedaBR, getStatusLabel } from '@/utils/formatters';
import { getHealthColor, getRiskColor, getRiskBgColor } from '@/lib/contractUtils';
import { StatusBadge, CriticalityBadge } from '@/components/shared/StatusBadge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Building2, Calendar, User, DollarSign, Shield, Loader2,FolderSearch,Scale } from 'lucide-react';
import { cn } from '@/lib/utils';

// Componentes das Abas
import ContractOverview from "@/components/contract/ContractOverview";
import ContractTimeline from "@/components/contract/ContractTimeline";
import ContractFinancial from "@/components/contract/ContractFinancial";
import ContractInvoices from "@/components/contract/ContractInvoices";
import ContractResponsibles from "@/components/contract/ContractResponsibles";
import ContractGuarantees from "@/components/contract/ContractGuarantees";
import ContractItems from "@/components/contract/ContractItems";

export default function Contract360() {
  const { id } = useParams();
  const [data360, setData360] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    async function loadContract360() {
      try {
        setLoading(true);
        const res = await fetch(`/api/v1/contracts/${id}`, {
          credentials: "include",
        });

        if (!res.ok) throw new Error(`Erro ao carregar contrato: ${res.status}`);
        
        const payload = await res.json();
        if (payload.success) {
          setData360(payload.data);
        } else {
          throw new Error(payload.message || "Erro desconhecido ao carregar contrato");
        }
      } catch (e) {
        console.error("[Contract360] Load error:", e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    loadContract360();
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px] gap-3 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-sm font-medium tracking-widest uppercase">Gerando Visão Analítica 360…</span>
      </div>
    );
  }

  if (error || !data360) {
    return (
      <div className="p-6 text-center space-y-4">
        <p className="text-destructive font-medium">Erro: {error || "Contrato não encontrado"}</p>
        <Link to="/contracts" className="text-primary text-sm hover:underline inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Voltar aos contratos
        </Link>
      </div>
    );
  }

  // Desestruturação segura do payload analítico (Contrato360Response)
  const { 
    resumo = {}, 
    financeiro = {}, 
    riscos = {}, 
    alertas = [], 
    timeline = [], 
    aditivos = [], 
    execucao = {}, 
    responsaveis = [], 
    garantias = [], 
    metadata = {} 
  } = data360;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* ─── HEADER ─── */}
      <div>
        <Link to="/contracts" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar aos Contratos
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="text-xl font-bold text-foreground">{resumo?.numero || "—"}</h1>
              <StatusBadge status={resumo?.situacao_real} />
              <CriticalityBadge criticality={riscos?.criticidade} />
            </div>
            <p
              className="
                mt-1
                max-w-5xl
                text-xs
                leading-relaxed
                text-foreground/65
              "
            >
              {resumo?.objeto || "Objeto não informado"}
            </p>
          </div>

          <div className="flex items-center gap-6 shrink-0 bg-accent/20 p-3 rounded-xl border border-border/50">
            <div className="text-center px-2">
              <div className={cn(
                "text-2xl font-bold tabular-nums", 
                getHealthColor(riscos?.saude_score || 0)
              )}>
                {riscos?.saude_score || 0}
              </div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Saúde</div>
            </div>
            
            <div className="w-px h-8 bg-border" />

            <div className="text-center px-2">
              <div className={cn(
                "text-2xl font-bold tabular-nums",
                resumo?.dias_restantes === null || resumo?.dias_restantes === undefined ? 'text-muted-foreground' : (resumo.dias_restantes <= 30 ? 'text-red-500' : 'text-foreground')
              )}>
                {resumo?.dias_restantes !== null && resumo?.dias_restantes !== undefined ? resumo.dias_restantes : '—'}
              </div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Dias Restantes</div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── SUMMARY CARDS ─── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <InfoCard icon={FolderSearch} label="Processo" value={resumo?.processo || "—"}/>
        <InfoCard icon={DollarSign} label="Valor Global" value={formatarMoedaBR(resumo?.valor_global)} />
        <InfoCard icon={Calendar} label="Vigência" value={`${formatarDataBR(resumo?.inicio_vigencia)} → ${formatarDataBR(resumo?.vencimento)}`}/>
        <InfoCard icon={Scale} label="Modalidade" value={resumo?.modalidade || "—"}/>
        <InfoCard icon={Shield}    label="Risco"      value={`${riscos?.risco_score || 0}/100`} />
        <InfoCard icon={Calendar}  label="Última Sinc" value={formatarDataHoraBR(metadata?.last_sync)} />
      </div>

      {/* ─── TABS ─── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-accent/50 w-full justify-start overflow-x-auto overflow-y-hidden h-auto p-1 gap-1">
          <TabsTrigger value="overview" className="text-xs py-2">Visão Geral</TabsTrigger>
          <TabsTrigger value="timeline" className="text-xs py-2">Histórico</TabsTrigger>
          <TabsTrigger value="financial" className="text-xs py-2">Empenhos</TabsTrigger>
          <TabsTrigger value="invoices" className="text-xs py-2">Faturas</TabsTrigger>
          <TabsTrigger value="responsibles" className="text-xs py-2">Responsáveis</TabsTrigger>
          <TabsTrigger value="guarantees" className="text-xs py-2">Garantia</TabsTrigger>
          <TabsTrigger value="items" className="text-xs py-2">Itens</TabsTrigger>
          <TabsTrigger value="risks" className="text-xs py-2">Riscos</TabsTrigger>
          <TabsTrigger value="amendments" className="text-xs py-2">Aditivos</TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <TabsContent value="overview">
            <ContractOverview 
              resumo={resumo} 
              riscos={riscos} 
              alertas={alertas} 
              aditivosCount={aditivos.length}
              metadata={metadata}
            />
          </TabsContent>

          <TabsContent value="timeline">
            <ContractTimeline contractDetail={{ historico: timeline || [] }} />
          </TabsContent>

          <TabsContent value="financial">
            <ContractFinancial 
              financialSummary={financeiro}
              contractDetail={{ empenhos: (financeiro?.exercicios || []).flatMap(e => e.itens || []) }}
            />
          </TabsContent>

          <TabsContent value="invoices">
            <ContractInvoices contractDetail={{ faturas: metadata?.faturas || [] }} />
          </TabsContent>

          <TabsContent value="responsibles">
            <ContractResponsibles contractDetail={{ responsaveis: responsaveis || [] }} />
          </TabsContent>

          <TabsContent value="guarantees">
            <ContractGuarantees contractDetail={{ garantias: garantias || [] }} />
          </TabsContent>

          <TabsContent value="items">
            <ContractItems contractDetail={{ itens: execucao?.itens || [] }} />
          </TabsContent>

          <TabsContent value="risks">
            <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" /> Análise de Risco Consolidada
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <RiskFactorCard label="Score Global" value={`${riscos?.risco_score || 0}/100`} score={riscos?.risco_score} />
                <RiskFactorCard label="Nível de Risco" value={riscos?.risco_nivel || "—"} score={riscos?.risco_score} />
                <RiskFactorCard label="Saúde Contratual" value={`${riscos?.saude_score || 0}%`} score={100 - (riscos?.saude_score || 0)} />
                <RiskFactorCard label="Progresso Temporal" value={`${(execucao?.percentual_tempo || 0).toFixed(1)}%`} />
              </div>
              
              {alertas.length > 0 && (
                <div className="pt-4 border-t border-border">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Alertas Ativos</h4>
                  <div className="space-y-2">
                    {alertas.map((alerta) => (
                      <div key={alerta.id} className="flex items-center gap-3 p-3 rounded-lg bg-accent/20 border border-border/50">
                        <span className={cn(
                          "w-2 h-2 rounded-full shrink-0 animate-pulse",
                          alerta.severidade === 'red' ? 'bg-red-500' : alerta.severidade === 'orange' ? 'bg-orange-500' : 'bg-amber-400'
                        )} title={alerta.severidade} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">{alerta?.titulo || "Alerta"}</p>
                          <p className="text-xs text-muted-foreground">{alerta?.descricao || "—"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="amendments">
             <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold mb-4">Histórico de Aditivos ({aditivos.length})</h3>
              {aditivos.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Nenhum aditivo registrado.</p>
              ) : (
                <div className="space-y-3">
                  {aditivos.map((amd, i) => (
                    <div key={i} className="p-4 rounded-xl border border-border bg-accent/10 hover:bg-accent/20 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono font-bold text-primary">{amd?.numero || "—"}</span>
                        <Badge variant="secondary" className="text-[10px] uppercase font-bold">{amd?.status || "Ativo"}</Badge>
                      </div>
                      <p className="text-sm font-medium mb-2">{amd?.descricao || "—"}</p>
                      <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground font-medium">
                        <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> {formatarDataBR(amd?.data_assinatura)}</span>
                        <span className="bg-primary/5 px-2 py-0.5 rounded text-primary">Tipo: {amd?.tipo || "Outros"}</span>
                        {(amd?.valor_alteracao || 0) !== 0 && (
                          <span className={cn("px-2 py-0.5 rounded", amd.valor_alteracao > 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500")}>
                            Variação: {formatarMoedaBR(amd.valor_alteracao)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

// ─── SUB-COMPONENTS ───
function InfoCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-sm hover:border-primary/20 transition-colors">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="p-1.5 rounded-lg bg-primary/5 text-primary">
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">{label}</span>
      </div>
      <p className="text-sm font-bold text-foreground truncate" title={value}>{value}</p>
    </div>
  );
}

function RiskFactorCard({ label, value, score }) {
  const riskColor = getRiskColor(score || 0);
  const isHigh = score >= 45;
  
  return (
    <div className={cn(
      "p-4 rounded-xl border transition-all", 
      isHigh ? 'bg-red-500/5 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.05)]' : 'bg-accent/20 border-border'
    )}>
      <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-1">{label}</p>
      <p className={cn("text-lg font-bold tabular-nums", riskColor)}>{value}</p>
    </div>
  );
}