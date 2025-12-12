import { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { api } from '@/services/api';
import { ChartData, TimePeriod } from '@/types/invoice';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const periods: { value: TimePeriod; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

export function InvoiceChart() {
  const [data, setData] = useState<ChartData[]>([]);
  const [period, setPeriod] = useState<TimePeriod>('monthly');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const chartData = await api.getChartData(period);
        setData(chartData);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [period]);

  return (
    <div className="rounded-xl border border-border bg-card p-6 card-elevated animate-slide-up">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Invoice Volume & Amount</h3>
          <p className="text-sm text-muted-foreground">Track your invoice processing over time</p>
        </div>

        <div className="flex gap-1 rounded-lg bg-secondary p-1">
          {periods.map((p) => (
            <Button
              key={p.value}
              variant="ghost"
              size="sm"
              onClick={() => setPeriod(p.value)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm',
                period === p.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-6 h-80">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(173, 80%, 40%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(173, 80%, 40%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(217, 33%, 22%)"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                stroke="hsl(215, 20%, 65%)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(215, 20%, 65%)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(222, 47%, 13%)',
                  border: '1px solid hsl(217, 33%, 22%)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 24px hsl(222, 47%, 5%, 0.4)',
                }}
                labelStyle={{ color: 'hsl(210, 40%, 98%)' }}
                itemStyle={{ color: 'hsl(215, 20%, 65%)' }}
                formatter={(value: number, name: string) => [
                  name === 'amount' ? `$${value.toLocaleString()}` : value,
                  name === 'amount' ? 'Amount' : 'Invoices',
                ]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(173, 80%, 40%)"
                strokeWidth={2}
                fill="url(#colorValue)"
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="hsl(199, 89%, 48%)"
                strokeWidth={2}
                fill="url(#colorAmount)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-4 flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-primary" />
          <span className="text-muted-foreground">Invoices</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-chart-2" />
          <span className="text-muted-foreground">Amount ($)</span>
        </div>
      </div>
    </div>
  );
}
