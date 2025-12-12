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
  Mail,
  MapPin,
  Phone,
  CheckCircle,
  XCircle,
  PenTool,
  Sparkles,
} from 'lucide-react';

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInvoice() {
      if (!id) return;
      try {
        const data = await api.getInvoice(id);
        setInvoice(data || null);
      } finally {
        setLoading(false);
      }
    }
    fetchInvoice();
  }, [id]);

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

  return (
    <DashboardLayout title="Invoice Details" subtitle={invoice.invoiceNumber}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link to="/invoices">
          <Button variant="ghost" className="text-muted-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Invoices
          </Button>
        </Link>
        <div className="flex gap-2">
          <Button variant="outline">
            <XCircle className="mr-2 h-4 w-4" />
            Reject
          </Button>
          <Button variant="success">
            <CheckCircle className="mr-2 h-4 w-4" />
            Approve
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
                <h2 className="text-2xl font-bold text-foreground">{invoice.invoiceNumber}</h2>
                <p className="mt-1 text-muted-foreground">{invoice.vendorName}</p>
              </div>
              <div className="flex items-center gap-3">
                <SourceTypeBadge sourceType={invoice.sourceType} />
                <InvoiceStatusBadge status={invoice.status} />
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Invoice Date</p>
                  <p className="font-medium text-foreground">
                    {format(new Date(invoice.invoiceDate), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                  <Calendar className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Due Date</p>
                  <p className="font-medium text-foreground">
                    {format(new Date(invoice.dueDate), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                  <CreditCard className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Payment Terms</p>
                  <p className="font-medium text-foreground">{invoice.paymentTerms}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="rounded-xl border border-border bg-card card-elevated overflow-hidden">
            <div className="border-b border-border px-6 py-4">
              <h3 className="text-lg font-semibold text-foreground">Line Items</h3>
            </div>
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
                  {invoice.lineItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 text-sm text-foreground">{item.description}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground text-right">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground text-right">
                        ${item.unitPrice.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-foreground text-right">
                        ${item.total.toLocaleString()}
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
                  <span className="text-foreground">${invoice.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex w-48 justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="text-foreground">${invoice.taxAmount.toLocaleString()}</span>
                </div>
                {invoice.discount > 0 && (
                  <div className="flex w-48 justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="text-success">-${invoice.discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex w-48 justify-between border-t border-border pt-2 text-lg font-bold">
                  <span className="text-foreground">Total</span>
                  <span className="text-primary">${invoice.total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="rounded-xl border border-border bg-card p-6 card-elevated">
              <h3 className="text-lg font-semibold text-foreground mb-3">Notes</h3>
              <p className="text-muted-foreground">{invoice.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* AI Confidence */}
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

            <div className="mt-4 flex flex-wrap gap-2">
              {invoice.hasSignature && (
                <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                  <CheckCircle className="h-3 w-3" />
                  Signature Detected
                </span>
              )}
              {invoice.hasHandwriting && (
                <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning">
                  <PenTool className="h-3 w-3" />
                  Handwriting Detected
                </span>
              )}
            </div>
          </div>

          {/* Vendor Info */}
          <div className="rounded-xl border border-border bg-card p-6 card-elevated">
            <h3 className="text-lg font-semibold text-foreground mb-4">Vendor Details</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">{invoice.vendorName}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Payment Method</p>
                  <p className="text-sm text-foreground">{invoice.paymentMethod}</p>
                </div>
              </div>
              {invoice.bankDetails && (
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Bank Details</p>
                    <p className="text-sm text-foreground">{invoice.bankDetails}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Processing Info */}
          <div className="rounded-xl border border-border bg-card p-6 card-elevated">
            <h3 className="text-lg font-semibold text-foreground mb-4">Processing Info</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Uploaded</span>
                <span className="text-foreground">
                  {format(new Date(invoice.createdAt), 'MMM dd, yyyy HH:mm')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Processed</span>
                <span className="text-foreground">
                  {format(new Date(invoice.processedAt), 'MMM dd, yyyy HH:mm')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Currency</span>
                <span className="text-foreground">{invoice.currency}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
