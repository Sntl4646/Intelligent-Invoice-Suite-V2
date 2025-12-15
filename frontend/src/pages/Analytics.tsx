import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { InvoiceChart } from '@/components/charts/InvoiceChart';
import { VendorSpendChart } from '@/components/charts/VendorSpendChart';
import { StatusChart } from '@/components/charts/StatusChart';
import { MetricCard } from '@/components/dashboard/MetricCard';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Clock,
  Target,
} from 'lucide-react';

export default function Analytics() {
  return (
    <DashboardLayout title="Analytics" subtitle="Deep dive into your financial data">
      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Monthly Revenue"
          value="$245,680"
          subtitle="December 2024"
          icon={<DollarSign className="h-6 w-6" />}
          trend={{ value: 12.5, isPositive: true }}
        />
        <MetricCard
          title="Invoices Processed"
          value="892"
          subtitle="This month"
          icon={<FileText className="h-6 w-6" />}
          trend={{ value: 8.3, isPositive: true }}
        />
        <MetricCard
          title="Avg Processing Time"
          value="2.3s"
          subtitle="Per invoice"
          icon={<Clock className="h-6 w-6" />}
          trend={{ value: 15, isPositive: true }}
        />
        <MetricCard
          title="Accuracy Rate"
          value="98.7%"
          subtitle="AI extraction"
          icon={<Target className="h-6 w-6" />}
          trend={{ value: 1.2, isPositive: true }}
        />
      </div>

      {/* Main Chart */}
      <div className="mt-6">
        <InvoiceChart />
      </div>

      {/* Secondary Charts */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <StatusChart />
        <VendorSpendChart />
      </div>

      {/* Insights Cards */}
      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6 card-elevated">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Top Category</h3>
            <TrendingUp className="h-5 w-5 text-success" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">Cloud Services</p>
          <p className="text-sm text-muted-foreground">$156,000 this quarter</p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-primary to-chart-2" />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 card-elevated">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Payment Trend</h3>
            <TrendingUp className="h-5 w-5 text-success" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">28 days</p>
          <p className="text-sm text-muted-foreground">Average payment cycle</p>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-success">↓ 3 days</span>
            <span className="text-muted-foreground">from last month</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 card-elevated">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Source Analysis</h3>
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">PDF Documents</span>
              <span className="text-foreground">65%</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Email Attachments</span>
              <span className="text-foreground">22%</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Scanned Images</span>
              <span className="text-foreground">13%</span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
