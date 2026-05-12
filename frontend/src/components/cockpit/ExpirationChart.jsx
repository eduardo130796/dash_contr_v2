import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';

const PT_MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const PT_MONTHS_LONG = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function BarTotalLabel(props) {
  const { x, y, width, value } = props;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return (
    <text
      x={x + width / 2}
      y={y - 5}
      fill="hsl(var(--muted-foreground))"
      fontSize={9}
      fontWeight={500}
      textAnchor="middle"
      className="tabular-nums"
    >
      {n}
    </text>
  );
}

function ExpirationTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const qtd = Number(row.quantidade ?? payload[0].value ?? 0);
  const titulo = row.periodoLegenda || '';
  return (
    <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-800 p-3 rounded-lg shadow-2xl">
      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">{titulo}</p>
      <p className="text-sm font-black text-white">
        {qtd} {qtd === 1 ? 'contrato vencendo' : 'contratos vencendo'}
      </p>
    </div>
  );
}

export default function ExpirationChart({ data: backendData }) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const availableYears = useMemo(() => {
    const years = new Set([new Date().getFullYear().toString()]);
    backendData?.forEach(item => {
      const [_, y] = item.mes.split('/');
      years.add(y);
    });
    return Array.from(years).sort();
  }, [backendData]);

  const chartData = useMemo(() => {
    const months = PT_MONTHS.map((name, idx) => ({
      month: name,
      quantidade: 0,
      periodoLegenda: `${PT_MONTHS_LONG[idx]}/${selectedYear}`,
    }));

    if (!backendData) return months;

    backendData.forEach(item => {
      const [m, y] = item.mes.split('/');
      if (y === selectedYear) {
        const monthIdx = parseInt(m, 10) - 1;
        if (months[monthIdx]) {
          months[monthIdx].quantidade = Number(item.quantidade) || 0;
        }
      }
    });

    return months;
  }, [backendData, selectedYear]);

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">
          Vencimentos Mensais
        </h3>
        
        <select 
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="bg-accent/50 border border-border rounded px-2 py-1 text-[10px] font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {availableYears.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 16, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontWeight: 500 }} 
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
              axisLine={false}
              tickLine={false}
              allowDecimals={false} 
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--accent))', opacity: 0.4 }}
              content={<ExpirationTooltip />}
            />
            <Bar dataKey="quantidade" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={32}>
              <LabelList dataKey="quantidade" content={<BarTotalLabel />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
