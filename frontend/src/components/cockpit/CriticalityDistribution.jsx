import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = {
  faixa1: '#ef4444',
  faixa2: '#f97316',
  faixa3: '#fbbf24',
  faixa4: '#10b981',
};

function toFiniteNumber(v) {
  if (v == null || v === '') return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function buildDistributionRows(kpis, criticalityDistribution) {
  const fromBlock =
    criticalityDistribution &&
    typeof criticalityDistribution === 'object' &&
    !Array.isArray(criticalityDistribution)
      ? criticalityDistribution
      : null;
  const base = { ...(kpis && typeof kpis === 'object' ? kpis : {}), ...(fromBlock || {}) };

  if (import.meta.env.DEV) {
    console.log('[CriticalityDistribution] criticality_distribution:', criticalityDistribution);
  }

  const estrategica = toFiniteNumber(base.estrategica);
  const alta = toFiniteNumber(base.alta);
  const media = toFiniteNumber(base.media);
  const baixa = toFiniteNumber(base.baixa);

  return [
    { nome: 'Estratégica', quantidade: estrategica, corKey: 'faixa1' },
    { nome: 'Alta', quantidade: alta, corKey: 'faixa2' },
    { nome: 'Média', quantidade: media, corKey: 'faixa3' },
    { nome: 'Baixa', quantidade: baixa, corKey: 'faixa4' },
  ];
}

function CriticidadeTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const qtd = toFiniteNumber(row.quantidade);
  return (
    <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-800 p-3 rounded-lg shadow-2xl">
      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">{row.nome}</p>
      <p className="text-sm font-black text-white">
        {qtd} {qtd === 1 ? 'contrato' : 'contratos'}
      </p>
    </div>
  );
}

export default function CriticalityDistribution({ kpis, criticalityDistribution }) {
  const chartData = useMemo(() => {
    const rows = buildDistributionRows(kpis, criticalityDistribution);
    return rows
      .filter((item) => item.quantidade > 0)
      .map((item) => ({
        nome: item.nome,
        quantidade: item.quantidade,
        corKey: item.corKey,
      }));
  }, [kpis, criticalityDistribution]);

  const temDados = chartData.length > 0;

  if (!temDados) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 h-[272px] flex flex-col">
        <h3 className="text-sm font-semibold text-foreground mb-4">Distribuição de Criticidade</h3>
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">
          Nenhum dado de criticidade disponível
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Distribuição de Criticidade</h3>
      <div className="flex items-center gap-4">
        <div className="h-44 w-44 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={4}
                dataKey="quantidade"
                nameKey="nome"
                stroke="none"
              >
                {chartData.map((entry) => (
                  <Cell key={entry.nome} fill={COLORS[entry.corKey]} />
                ))}
              </Pie>
              <Tooltip content={<CriticidadeTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-3 flex-1">
          {chartData.map((item) => (
            <div key={item.nome} className="flex items-center justify-between group cursor-default">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full transition-transform group-hover:scale-125"
                  style={{ backgroundColor: COLORS[item.corKey] }}
                />
                <span className="text-xs text-muted-foreground font-medium group-hover:text-foreground transition-colors">
                  {item.nome}
                </span>
              </div>
              <span className="text-sm font-bold text-foreground tabular-nums">{item.quantidade}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
