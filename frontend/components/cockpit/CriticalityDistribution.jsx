import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useData } from '@/lib/DataContext';

const COLORS = {
  low: '#10b981',
  attention: '#fbbf24',
  critical: '#f97316',
  urgent: '#ef4444',
};

export default function CriticalityDistribution() {
  const { contracts } = useData();

  const data = useMemo(() => {
    const counts = { low: 0, attention: 0, critical: 0, urgent: 0 };
    contracts.forEach(c => { counts[c.criticality] = (counts[c.criticality] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value, key: name }));
  }, [contracts]);

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Criticality Distribution</h3>
      <div className="flex items-center gap-4">
        <div className="h-44 w-44 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                {data.map((entry) => (
                  <Cell key={entry.key} fill={COLORS[entry.key]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2.5 flex-1">
          {data.map(item => (
            <div key={item.key} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[item.key] }} />
                <span className="text-xs text-muted-foreground">{item.name}</span>
              </div>
              <span className="text-sm font-semibold text-foreground">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}