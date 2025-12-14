import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Invoice } from '@/types/invoice';
import { api } from '@/services/api';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import { SourceTypeBadge } from './SourceTypeBadge';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export function RecentInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔁 Fetch invoices and listen for the “invoiceUploaded” event
  useEffect(() => {
    async function fetchInvoices() {
      try {
        const data = await api.getInvoices();
        setInvoices(data.slice(0, 5));
      } finally {
        setLoading(false);
      }
    }

    // Initial fetch
    fetchInvoices();

    // When a new invoice is uploaded, refresh the list
    const handleInvoiceUploaded = () => {
      setLoading(true);
      fetchInvoices();
    };

    window.addEventListener('invoiceUploaded', handleInvoiceUploaded);
    return () => window.removeEventListener('invoiceUploaded', handleInvoiceUploaded);
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card card-elevated animate-slide-up">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Recent Invoices</h3>
          <p className="text-sm text-muted-foreground">Latest processed invoices</p>
        </div>
        <Link to="/invoices">
          <Button variant="ghost" size="sm" className="text-primary">
            View All
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="divide-y divide-border">
        {invoices.map((invoice) => (
          <Link
            key={invoice.id}
            to={`/invoices/${invoice.id}`}
            className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-secondary/50"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-sm font-medium text-foreground">
                {invoice.vendorName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-foreground">{invoice.invoiceNumber}</p>
                <p className="text-sm text-muted-foreground">{invoice.vendorName}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <SourceTypeBadge sourceType={invoice.sourceType} />
              <div className="text-right">
                <p className="font-medium text-foreground">
                  ${invoice.total.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(invoice.invoiceDate), 'MMM dd, yyyy')}
                </p>
              </div>
              <InvoiceStatusBadge status={invoice.status} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
