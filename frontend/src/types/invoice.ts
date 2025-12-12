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
  invoiceNumber: string;
  vendorId: string;
  vendorName: string;
  invoiceDate: string;
  dueDate: string;
  status: 'pending' | 'processing' | 'approved' | 'paid' | 'rejected';
  subtotal: number;
  taxAmount: number;
  discount: number;
  total: number;
  currency: string;
  lineItems: LineItem[];
  paymentTerms: string;
  paymentMethod: string;
  bankDetails?: string;
  notes?: string;
  hasSignature: boolean;
  hasHandwriting: boolean;
  sourceType: 'pdf' | 'email' | 'image' | 'handwritten';
  confidence: number;
  processedAt: string;
  createdAt: string;
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
