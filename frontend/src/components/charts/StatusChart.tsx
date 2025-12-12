import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { api } from '@/services/api';
import { ChartData } from '@/types/invoice';
import { Loader2 } from 'lucide-react';

const statusColors: Record<string, string> = {
  Paid: 'hsl(142, 76%, 36%)',
  Approved: 'hsl(173, 80%, 40%)',
  Processing: 'hsl(199, 89%, 48%)',
  Pending: 'hsl(38, 92%, 50%)',
  Rejected: 'hsl(0, 72%, 51%)',
};

export function StatusChart() {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const chartData = await api.getInvoiceStatusData();
        setData(chartData);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-80 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 card-elevated animate-slide-up">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Invoice Status Distribution</h3>
        <p className="text-sm text-muted-foreground">Current status of all invoices</p>
      </div>

      <div className="mt-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(217, 33%, 22%)"
              horizontal={true}
              vertical={false}
            />
            <XAxis
              type="number"
              stroke="hsl(215, 20%, 65%)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke="hsl(215, 20%, 65%)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={80}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(222, 47%, 13%)',
                border: '1px solid hsl(217, 33%, 22%)',
                borderRadius: '8px',
              }}
              labelStyle={{ color: 'hsl(210, 40%, 98%)' }}
              formatter={(value: number) => [value, 'Invoices']}
            />
            <Bar
              dataKey="value"
              radius={[0, 4, 4, 0]}
              fill="hsl(173, 80%, 40%)"
              shape={(props: any) => {
                const { x, y, width, height, payload } = props;
                const fill = statusColors[payload.name] || 'hsl(173, 80%, 40%)';
                return (
                  <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    fill={fill}
                    rx={4}
                    ry={4}
                  />
                );
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
