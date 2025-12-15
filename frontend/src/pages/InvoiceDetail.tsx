// InvoiceDetail.tsx – Enhanced with AI Insights + Extracted Summary Table
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { InvoiceStatusBadge } from '@/components/dashboard/InvoiceStatusBadge';
import { SourceTypeBadge } from '@/components/dashboard/SourceTypeBadge';
import { Button } from '@/components/ui/button';
import { api } from '@/services/api';
import { Invoice } from '@/types/invoice';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Building2,
  Calendar,
  CreditCard,
  FileText,
  Loader2,
  CheckCircle,
  XCircle,
  PenTool,
  Sparkles,
  Brain, // 🔥 NEW (for AI icon)
  Table,
} from 'lucide-react';

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    async function fetchInvoice() {
      if (!id) return;
      try {
        const data = await api.getInvoice(id);
        console.log('📄 Invoice detail data:', data);
        setInvoice(data || null);
      } catch (error) {
        console.error('❌ Error fetching invoice:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchInvoice();
  }, [id]);

  const handleStatusUpdate = async (newStatus: 'approved' | 'rejected') => {
    if (!id || !invoice) return;
    setUpdating(true);
    try {
      const result = await api.updateInvoiceStatus(id, newStatus);
      if (result) {
        setInvoice({ ...invoice, status: newStatus });
        alert(`Invoice ${newStatus} successfully!`);
      }
    } catch {
      alert(`Failed to ${newStatus === 'approved' ? 'approve' : 'reject'} invoice`);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Invoice Details">
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!invoice) {
    return (
      <DashboardLayout title="Invoice Not Found">
        <div className="flex h-96 flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground">Invoice not found</p>
          <Link to="/invoices">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Invoices
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const getInvoiceDate = () => {
    const date = invoice.invoiceDate || invoice.issue_date;
    return date ? format(new Date(date), 'MMM dd, yyyy') : 'N/A';
  };
  const getDueDate = () => {
    const date = invoice.dueDate || invoice.due_date;
    return date ? format(new Date(date), 'MMM dd, yyyy') : 'N/A';
  };
  const getCreatedDate = () => {
    const date = invoice.createdAt || invoice.created_at;
    return date ? format(new Date(date), 'MMM dd, yyyy HH:mm') : 'N/A';
  };
  const getProcessedDate = () => {
    const date = invoice.processedAt;
    return date ? format(new Date(date), 'MMM dd, yyyy HH:mm') : 'N/A';
  };

  return (
    <DashboardLayout
      title="Invoice Details"
      subtitle={invoice.invoiceNumber || invoice.invoice_number || 'N/A'}
    >
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link to="/invoices">
          <Button variant="ghost" className="text-muted-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Invoices
          </Button>
        </Link>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleStatusUpdate('rejected')}
            disabled={updating || invoice.status === 'rejected'}
          >
            <XCircle className="mr-2 h-4 w-4" />
            {updating ? 'Updating...' : 'Reject'}
          </Button>
          <Button
            variant="default"
            className="bg-green-600 hover:bg-green-700"
            onClick={() => handleStatusUpdate('approved')}
            disabled={updating || invoice.status === 'approved'}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            {updating ? 'Updating...' : 'Approve'}
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Header Card */}
          <div className="rounded-xl border border-border bg-card p-6 card-elevated">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  {invoice.invoiceNumber || invoice.invoice_number || 'N/A'}
                </h2>
                <p className="mt-1 text-muted-foreground">
                  {invoice.vendorName || invoice.vendor_name || 'Unknown Vendor'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <SourceTypeBadge sourceType={invoice.sourceType || 'pdf'} />
                <InvoiceStatusBadge status={invoice.status || 'pending'} />
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Invoice Date</p>
                  <p className="font-medium text-foreground">{getInvoiceDate()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-warning" />
                <div>
                  <p className="text-xs text-muted-foreground">Due Date</p>
                  <p className="font-medium text-foreground">{getDueDate()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-success" />
                <div>
                  <p className="text-xs text-muted-foreground">Payment Terms</p>
                  <p className="font-medium text-foreground">
                    {invoice.paymentTerms || invoice.payment_terms || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="rounded-xl border border-border bg-card card-elevated overflow-hidden">
            <div className="border-b border-border px-6 py-4">
              <h3 className="text-lg font-semibold text-foreground">Line Items</h3>
            </div>
            {invoice.lineItems && invoice.lineItems.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-secondary/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                          Description
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                          Qty
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                          Unit Price
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {invoice.lineItems.map((item, index) => (
                        <tr key={item.id || index}>
                          <td className="px-6 py-4 text-sm text-foreground">{item.description}</td>
                          <td className="px-6 py-4 text-sm text-muted-foreground text-right">
                            {item.quantity}
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground text-right">
                            ${item.unitPrice?.toLocaleString() || '0'}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-foreground text-right">
                            ${item.total?.toLocaleString() || '0'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="border-t border-border bg-secondary/30 px-6 py-4">
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex w-48 justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="text-foreground">
                        ${(invoice.subtotal || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex w-48 justify-between text-sm">
                      <span className="text-muted-foreground">Tax</span>
                      <span className="text-foreground">
                        ${(invoice.taxAmount || invoice.tax_amount || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex w-48 justify-between border-t border-border pt-2 text-lg font-bold">
                      <span className="text-foreground">Total</span>
                      <span className="text-primary">
                        ${(invoice.total || invoice.total_amount || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="px-6 py-8 text-center text-muted-foreground">
                No line items available
              </div>
            )}
          </div>

          {/* 🔥 NEW - AI INSIGHTS SECTION */}
          {invoice.aiInsights && (
            <div className="rounded-xl border border-border bg-card p-6 card-elevated shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-purple-400/20">
                  <Brain className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">AI Insights</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-1">
                <strong>Category:</strong> {invoice.aiCategory || 'Uncategorized'}
              </p>
              <p className="text-sm leading-relaxed">{invoice.aiInsights}</p>
            </div>
          )}

          {/* 🔥 NEW - EXTRACTED SUMMARY TABLE */}
          {invoice.summaryTable && invoice.summaryTable.length > 0 && (
            <div className="rounded-xl border border-border bg-card card-elevated overflow-hidden">
              <div className="border-b border-border bg-secondary/50 px-6 py-4 flex items-center gap-2">
                <Table className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold text-foreground">Extracted Fields</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {invoice.summaryTable.map((row, i) => (
                      <tr key={i} className="border-b border-border hover:bg-secondary/10">
                        <td className="px-6 py-2 font-medium text-muted-foreground w-1/3">
                          {row.field}
                        </td>
                        <td className="px-6 py-2 text-foreground">{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          

          {/* Notes */}
          {invoice.notes && (
            <div className="rounded-xl border border-border bg-card p-6 card-elevated">
              <h3 className="text-lg font-semibold text-foreground mb-3">Notes</h3>
              <p className="text-muted-foreground">{invoice.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        {/* (Your existing sidebar unchanged) */}
        <div className="space-y-6">
          {/* AI Confidence */}
          {invoice.confidence !== undefined && (
            <div className="rounded-xl border border-border bg-card p-6 card-elevated">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-chart-2">
                  <Sparkles className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">AI Extraction</h3>
                  <p className="text-xs text-muted-foreground">Confidence Score</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-3 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-chart-2 transition-all duration-500"
                    style={{ width: `${invoice.confidence}%` }}
                  />
                </div>
                <span className="text-lg font-bold text-foreground">{invoice.confidence}%</span>
              </div>
            </div>
          )}
          {/* (rest unchanged...) */}
        </div>
      </div>
    </DashboardLayout>
  );
}
