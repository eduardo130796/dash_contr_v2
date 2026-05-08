import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useData } from '@/lib/DataContext';
import { format, addMonths, startOfMonth, endOfMonth, parseISO, isValid } from 'date-fns';

export default function ExpirationChart() {
  const { contracts } = useData();

  const data = useMemo(() => {
    const months = [];
    const today = new Date();

    for (let i = 0; i < 12; i++) {
      const month = addMonths(today, i);
      const start = startOfMonth(month);
      const end = endOfMonth(month);

      const count = contracts.filter(c => {
        if (!c.end_date) return false; // 🔥 proteção 1

        let d;
        try {
          d = parseISO(c.end_date);
        } catch {
          return false; // 🔥 proteção 2
        }

        if (!isValid(d)) return false; // 🔥 proteção 3

        return d >= start && d <= end;
      }).length;

      months.push({
        month: format(month, 'MMM yy'),
        contracts: count,
      });
    }

    return months;
  }, [contracts]);

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">
        Vencimentos Mensais (Próximos 12 meses)
      </h3>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 8,
                fontSize: 12
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Bar dataKey="contracts" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}