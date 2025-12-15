import { cn } from '@/lib/utils';
import { Invoice } from '@/types/invoice';
import { FileText, Mail, Image, PenTool } from 'lucide-react';

interface SourceTypeBadgeProps {
  sourceType: Invoice['sourceType'];
}

const sourceConfig = {
  pdf: {
    label: 'PDF',
    icon: FileText,
    className: 'bg-destructive/10 text-destructive',
  },
  email: {
    label: 'Email',
    icon: Mail,
    className: 'bg-chart-2/10 text-chart-2',
  },
  image: {
    label: 'Image',
    icon: Image,
    className: 'bg-chart-5/10 text-chart-5',
  },
  handwritten: {
    label: 'Handwritten',
    icon: PenTool,
    className: 'bg-warning/10 text-warning',
  },
};

export function SourceTypeBadge({ sourceType }: SourceTypeBadgeProps) {
  const config = sourceConfig[sourceType];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium',
        config.className
      )}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}
