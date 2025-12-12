import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/services/api';
import { Vendor } from '@/types/invoice';
import {
  Search,
  Plus,
  Building2,
  Mail,
  Phone,
  FileText,
  DollarSign,
  Clock,
  Loader2,
  MoreVertical,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export default function Vendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchVendors() {
      try {
        const data = await api.getVendors();
        setVendors(data);
      } finally {
        setLoading(false);
      }
    }
    fetchVendors();
  }, []);

  const filteredVendors = vendors.filter(
    (vendor) =>
      vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout title="Vendors" subtitle="Manage your vendor relationships">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search vendors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="gradient">
          <Plus className="mr-2 h-4 w-4" />
          Add Vendor
        </Button>
      </div>

      {/* Vendor Grid */}
      {loading ? (
        <div className="mt-6 flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredVendors.map((vendor, index) => (
            <div
              key={vendor.id}
              className="rounded-xl border border-border bg-card p-6 card-elevated animate-slide-up hover:border-primary/30 transition-colors"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary">
                    {vendor.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{vendor.name}</h3>
                    <span
                      className={cn(
                        'text-xs font-medium',
                        vendor.status === 'active' ? 'text-success' : 'text-muted-foreground'
                      )}
                    >
                      {vendor.status === 'active' ? '● Active' : '○ Inactive'}
                    </span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>View Details</DropdownMenuItem>
                    <DropdownMenuItem>View Invoices</DropdownMenuItem>
                    <DropdownMenuItem>Edit Vendor</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Contact Info */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{vendor.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{vendor.phone}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="mt-4 grid grid-cols-3 gap-4 border-t border-border pt-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground">
                    <FileText className="h-3 w-3" />
                  </div>
                  <p className="mt-1 text-lg font-bold text-foreground">{vendor.totalInvoices}</p>
                  <p className="text-xs text-muted-foreground">Invoices</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground">
                    <DollarSign className="h-3 w-3" />
                  </div>
                  <p className="mt-1 text-lg font-bold text-foreground">
                    ${(vendor.totalSpend / 1000).toFixed(0)}k
                  </p>
                  <p className="text-xs text-muted-foreground">Total Spend</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                  </div>
                  <p className="mt-1 text-lg font-bold text-foreground">
                    {vendor.avgPaymentDays}d
                  </p>
                  <p className="text-xs text-muted-foreground">Avg Days</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredVendors.length === 0 && (
        <div className="mt-6 flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border">
          <Building2 className="h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-lg font-medium text-foreground">No vendors found</p>
          <p className="text-sm text-muted-foreground">
            {searchQuery ? 'Try a different search term' : 'Add your first vendor to get started'}
          </p>
        </div>
      )}
    </DashboardLayout>
  );
}
