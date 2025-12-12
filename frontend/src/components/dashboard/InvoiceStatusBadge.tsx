import { cn } from '@/lib/utils';
import { Invoice } from '@/types/invoice';

interface InvoiceStatusBadgeProps {
  status: Invoice['status'];
}

const statusConfig = {
  pending: {
    label: 'Pending',
    className: 'bg-warning/10 text-warning border-warning/20',
  },
  processing: {
    label: 'Processing',
    className: 'bg-chart-2/10 text-chart-2 border-chart-2/20',
  },
  approved: {
    label: 'Approved',
    className: 'bg-primary/10 text-primary border-primary/20',
  },
  paid: {
    label: 'Paid',
    className: 'bg-success/10 text-success border-success/20',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-destructive/10 text-destructive border-destructive/20',
  },
};

export function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        config.className
      )}
    >
      <span
        className={cn(
          'mr-1.5 h-1.5 w-1.5 rounded-full',
          status === 'pending' && 'bg-warning',
          status === 'processing' && 'bg-chart-2 animate-pulse',
          status === 'approved' && 'bg-primary',
          status === 'paid' && 'bg-success',
          status === 'rejected' && 'bg-destructive'
        )}
      />
      {config.label}
    </span>
  );
}
