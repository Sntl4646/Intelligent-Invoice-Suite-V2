//This is the Invoices.tsx file for displaying and managing a list of invoices in a dashboard layout.'
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { InvoiceStatusBadge } from '@/components/dashboard/InvoiceStatusBadge';
import { SourceTypeBadge } from '@/components/dashboard/SourceTypeBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api } from '@/services/api';
import { Invoice } from '@/types/invoice';
import { format } from 'date-fns';
import {
  Search,
  Filter,
  Upload,
  Eye,
  Loader2,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react';

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  // ✅ Separate fetch function
  const fetchInvoices = async (showLoader = true) => {
    try {
      if (showLoader) {
        setRefreshing(true);
      }
      console.log('📥 Fetching invoices from API...');
      const data = await api.getInvoices();
      console.log('📥 Received invoices:', data);
      setInvoices(data || []);
    } catch (error) {
      console.error('❌ Error fetching invoices:', error);
      setInvoices([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ✅ Initial load
  useEffect(() => {
    fetchInvoices();
  }, []);

  // ✅ Listen for upload events from Upload page
  useEffect(() => {
    const handleInvoiceUploaded = () => {
      console.log('🔔 Invoice uploaded event received, refreshing list...');
      fetchInvoices(false);
    };

    window.addEventListener('invoiceUploaded', handleInvoiceUploaded);
    return () => {
      window.removeEventListener('invoiceUploaded', handleInvoiceUploaded);
    };
  }, []);

  // ✅ Auto-refresh when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ Tab visible, refreshing invoices...');
        fetchInvoices(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleRefresh = () => {
    fetchInvoices(true);
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const invoiceNum = invoice.invoice_number || invoice.invoiceNumber || '';
    const vendorName = invoice.vendor_name || invoice.vendorName || '';
    
    const matchesSearch =
      invoiceNum.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendorName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    const matchesSource = sourceFilter === 'all' || invoice.sourceType === sourceFilter;
    return matchesSearch && matchesStatus && matchesSource;
  });

  return (
    <DashboardLayout title="Invoices" subtitle="Manage and track all your invoices">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by invoice # or vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="processed">Processed</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="image">Image</SelectItem>
              <SelectItem value="handwritten">Handwritten</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Link to="/upload">
            <Button variant="gradient">
              <Upload className="mr-2 h-4 w-4" />
              Upload Invoice
            </Button>
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="mt-6 rounded-xl border border-border bg-card card-elevated overflow-hidden">
        {loading ? (
          <div className="flex h-96 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex h-96 flex-col items-center justify-center gap-4">
            <p className="text-muted-foreground">No invoices found</p>
            <Link to="/upload">
              <Button variant="gradient">
                <Upload className="mr-2 h-4 w-4" />
                Upload Your First Invoice
              </Button>
            </Link>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">
                  <div className="flex items-center gap-1">
                    Invoice #
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead className="text-muted-foreground">Vendor</TableHead>
                <TableHead className="text-muted-foreground">Date</TableHead>
                <TableHead className="text-muted-foreground">Due Date</TableHead>
                <TableHead className="text-muted-foreground">Amount</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id} className="border-border">
                  <TableCell className="font-medium text-foreground">
                    {invoice.invoice_number || invoice.invoiceNumber || 'N/A'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {invoice.vendor_name || invoice.vendorName || 'Unknown'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {invoice.issue_date || invoice.invoiceDate
                      ? format(new Date(invoice.issue_date || invoice.invoiceDate), 'MMM dd, yyyy')
                      : 'N/A'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {invoice.due_date || invoice.dueDate
                      ? format(new Date(invoice.due_date || invoice.dueDate), 'MMM dd, yyyy')
                      : 'N/A'}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    ${((invoice.total_amount || invoice.total || 0)).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <InvoiceStatusBadge status={invoice.status || 'pending'} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Link to={`/invoices/${invoice.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      {invoice.status === 'pending' && (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-success">
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Summary */}
      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <p>
          Showing {filteredInvoices.length} of {invoices.length} invoices
        </p>
        <p>
          Total: $
          {filteredInvoices.reduce((sum, inv) => sum + (inv.total_amount || inv.total || 0), 0).toLocaleString()}
        </p>
      </div>
    </DashboardLayout>
  );
}