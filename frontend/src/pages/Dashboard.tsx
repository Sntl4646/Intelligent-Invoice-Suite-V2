// src/pages/Dashboard.tsx - UPDATED VERSION
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { RecentInvoices } from '@/components/dashboard/RecentInvoices';
import { TopVendors } from '@/components/dashboard/TopVendors';
import { InvoiceChart } from '@/components/charts/InvoiceChart';
import { VendorSpendChart } from '@/components/charts/VendorSpendChart';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import {
  FileText,
  CheckCircle,
  Clock,
  Users,
  DollarSign,
  Zap,
  Target,
  Loader2,
} from 'lucide-react';

export default function Dashboard() {
  const { metrics, loading, error } = useDashboardMetrics();

  if (loading) {
    return (
      <DashboardLayout title="Dashboard" subtitle="Overview of your invoice processing">
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Dashboard" subtitle="Overview of your invoice processing">
        <div className="flex h-96 flex-col items-center justify-center gap-4">
          <p className="text-destructive">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-white rounded-lg"
          >
            Retry
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard" subtitle="Overview of your invoice processing">
      {/* Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Invoices"
          value={metrics.totalInvoices.toLocaleString()}
          subtitle="All time"
          icon={<FileText className="h-6 w-6" />}
          trend={{ value: 12, isPositive: true }}
        />
        <MetricCard
          title="Processed"
          value={metrics.totalProcessed.toLocaleString()}
          subtitle="Successfully extracted"
          icon={<CheckCircle className="h-6 w-6" />}
          trend={{ value: 8, isPositive: true }}
        />
        <MetricCard
          title="Pending"
          value={metrics.totalPending.toLocaleString()}
          subtitle="Awaiting review"
          icon={<Clock className="h-6 w-6" />}
          trend={{ value: 3, isPositive: false }}
        />
        <MetricCard
          title="Vendors"
          value={metrics.totalVendors.toLocaleString()}
          subtitle="Active vendors"
          icon={<Users className="h-6 w-6" />}
          trend={{ value: 5, isPositive: true }}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <MetricCard
          title="Total Amount"
          value={`$${metrics.totalAmount.toLocaleString()}`}
          subtitle="Processed this year"
          icon={<DollarSign className="h-6 w-6" />}
          trend={{ value: 18, isPositive: true }}
        />
        <MetricCard
          title="Avg Processing Time"
          value={`${metrics.avgProcessingTime}s`}
          subtitle="Per invoice"
          icon={<Zap className="h-6 w-6" />}
          trend={{ value: 15, isPositive: true }}
        />
        <MetricCard
          title="Success Rate"
          value={`${metrics.successRate}%`}
          subtitle="Extraction accuracy"
          icon={<Target className="h-6 w-6" />}
          trend={{ value: 2, isPositive: true }}
        />
      </div>

      {/* Charts */}
      <div className="mt-6">
        <InvoiceChart />
      </div>

      {/* Bottom Grid */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <RecentInvoices />
        <div className="space-y-6">
          <TopVendors />
          <VendorSpendChart />
        </div>
      </div>
    </DashboardLayout>
  );
}