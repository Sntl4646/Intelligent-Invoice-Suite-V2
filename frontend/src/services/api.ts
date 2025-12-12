// API service layer - ready to connect to Python backend
// Replace these mock implementations with actual API calls

import { Invoice, Vendor, DashboardMetrics, ChartData, TimePeriod } from '@/types/invoice';
import {
  mockInvoices,
  mockVendors,
  mockMetrics,
  monthlyData,
  quarterlyData,
  yearlyData,
  vendorSpendData,
  invoiceStatusData,
  sourceTypeData,
} from '@/data/mockData';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const api = {
  // Invoice endpoints
  async getInvoices(): Promise<Invoice[]> {
    await delay(500);
    // Replace with: return fetch(`${API_BASE_URL}/invoices`).then(res => res.json());
    return mockInvoices;
  },

  async getInvoice(id: string): Promise<Invoice | undefined> {
    await delay(300);
    // Replace with: return fetch(`${API_BASE_URL}/invoices/${id}`).then(res => res.json());
    return mockInvoices.find(inv => inv.id === id);
  },

  async uploadInvoice(file: File): Promise<{ success: boolean; invoice?: Invoice; error?: string }> {
    await delay(1500);
    // Replace with actual upload logic:
    // const formData = new FormData();
    // formData.append('file', file);
    // return fetch(`${API_BASE_URL}/invoices/upload`, { method: 'POST', body: formData }).then(res => res.json());
    return { success: true, invoice: mockInvoices[0] };
  },

  async updateInvoiceStatus(id: string, status: Invoice['status']): Promise<Invoice> {
    await delay(300);
    // Replace with: return fetch(`${API_BASE_URL}/invoices/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }).then(res => res.json());
    const invoice = mockInvoices.find(inv => inv.id === id);
    if (invoice) {
      invoice.status = status;
    }
    return invoice!;
  },

  // Vendor endpoints
  async getVendors(): Promise<Vendor[]> {
    await delay(400);
    // Replace with: return fetch(`${API_BASE_URL}/vendors`).then(res => res.json());
    return mockVendors;
  },

  async getVendor(id: string): Promise<Vendor | undefined> {
    await delay(300);
    // Replace with: return fetch(`${API_BASE_URL}/vendors/${id}`).then(res => res.json());
    return mockVendors.find(v => v.id === id);
  },

  async getVendorInvoices(vendorId: string): Promise<Invoice[]> {
    await delay(400);
    // Replace with: return fetch(`${API_BASE_URL}/vendors/${vendorId}/invoices`).then(res => res.json());
    return mockInvoices.filter(inv => inv.vendorId === vendorId);
  },

  // Dashboard & Analytics endpoints
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    await delay(300);
    // Replace with: return fetch(`${API_BASE_URL}/dashboard/metrics`).then(res => res.json());
    return mockMetrics;
  },

  async getChartData(period: TimePeriod): Promise<ChartData[]> {
    await delay(300);
    // Replace with: return fetch(`${API_BASE_URL}/analytics/invoices?period=${period}`).then(res => res.json());
    switch (period) {
      case 'monthly':
        return monthlyData;
      case 'quarterly':
        return quarterlyData;
      case 'yearly':
        return yearlyData;
      default:
        return monthlyData;
    }
  },

  async getVendorSpendData(): Promise<ChartData[]> {
    await delay(300);
    // Replace with: return fetch(`${API_BASE_URL}/analytics/vendor-spend`).then(res => res.json());
    return vendorSpendData;
  },

  async getInvoiceStatusData(): Promise<ChartData[]> {
    await delay(300);
    // Replace with: return fetch(`${API_BASE_URL}/analytics/invoice-status`).then(res => res.json());
    return invoiceStatusData;
  },

  async getSourceTypeData(): Promise<ChartData[]> {
    await delay(300);
    // Replace with: return fetch(`${API_BASE_URL}/analytics/source-types`).then(res => res.json());
    return sourceTypeData;
  },

  // AI Processing endpoints
  async processWithAI(invoiceId: string): Promise<{ success: boolean; data?: any }> {
    await delay(2000);
    // Replace with: return fetch(`${API_BASE_URL}/ai/process/${invoiceId}`, { method: 'POST' }).then(res => res.json());
    return { success: true, data: { confidence: 98.5 } };
  },

  async extractData(file: File): Promise<{ success: boolean; extractedData?: Partial<Invoice> }> {
    await delay(3000);
    // Replace with actual LangChain/Vision model processing:
    // const formData = new FormData();
    // formData.append('file', file);
    // return fetch(`${API_BASE_URL}/ai/extract`, { method: 'POST', body: formData }).then(res => res.json());
    return {
      success: true,
      extractedData: {
        invoiceNumber: 'AI-EXTRACTED-001',
        vendorName: 'Detected Vendor',
        total: 5000,
        confidence: 96.7,
      },
    };
  },
};
