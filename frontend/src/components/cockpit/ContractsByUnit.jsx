import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useData } from '@/lib/DataContext';

export default function ContractsByUnit() {
  const { contracts } = useData();

  const data = useMemo(() => {
    const units = {};
    contracts.forEach(c => { units[c.unit] = (units[c.unit] || 0) + 1; });
    return Object.entries(units)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8)
      .map(([unit, count]) => ({ unit: unit.length > 18 ? unit.slice(0, 18) + '...' : unit, count }));
  }, [contracts]);

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Contracts by Unit</h3>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
            <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
            <YAxis type="category" dataKey="unit" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={120} />
            <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}