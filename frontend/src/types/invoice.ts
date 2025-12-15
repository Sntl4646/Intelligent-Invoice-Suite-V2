export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Vendor {
  id: string;
  name: string;
  address: string;
  email: string;
  phone: string;
  taxId: string;
  totalInvoices: number;
  totalSpend: number;
  avgPaymentDays: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface Invoice {
  id: string;
  
  // ✅ Support both camelCase and snake_case from backend
  invoiceNumber: string;
  invoice_number?: string;
  
  vendorId: string;
  vendor_id?: string;
  
  vendorName: string;
  vendor_name?: string;
  
  invoiceDate: string;
  issue_date?: string;
  
  dueDate: string;
  due_date?: string;
  
  // ✅ Added 'processed' status
  status: 'pending' | 'processing' | 'processed' | 'approved' | 'paid' | 'rejected';
  
  subtotal: number;
  
  taxAmount: number;
  tax_amount?: number;
  
  discount: number;
  
  total: number;
  total_amount?: number;
  
  currency: string;
  lineItems: LineItem[];
  
  paymentTerms: string;
  payment_terms?: string;
  
  paymentMethod: string;
  bankDetails?: string;
  notes?: string;
  hasSignature: boolean;
  hasHandwriting: boolean;
  sourceType: 'pdf' | 'email' | 'image' | 'handwritten';
  confidence: number;
  processedAt: string;
  
  createdAt: string;
  created_at?: string;
}

export interface DashboardMetrics {
  totalInvoices: number;
  totalProcessed: number;
  totalPending: number;
  totalVendors: number;
  totalAmount: number;
  avgProcessingTime: number;
  successRate: number;
}

export interface ChartData {
  name: string;
  value: number;
  amount?: number;
  invoices?: number;
}

export type TimePeriod = 'monthly' | 'quarterly' | 'yearly';