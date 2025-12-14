// API service layer - connected to Python FastAPI backend

import { Invoice, Vendor, DashboardMetrics, ChartData, TimePeriod } from '@/types/invoice';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Simple helper
const handleResponse = async (res: Response) => {
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

export const api = {
  // ----------------- INVOICES -----------------
  async getInvoices(): Promise<Invoice[]> {
    const res = await fetch(`${API_BASE_URL}/invoices`);
    return handleResponse(res);
  },

  async getInvoice(id: string): Promise<Invoice> {
    const res = await fetch(`${API_BASE_URL}/invoices/${id}`);
    return handleResponse(res);
  },

  async uploadInvoice(file: File): Promise<{ success: boolean; invoice?: Invoice; error?: string }> {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_BASE_URL}/invoices/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Upload failed:", errorText);
        return { success: false, error: errorText || "Upload failed" };
      }

      const data = await response.json();
      return { success: true, invoice: data };
    } catch (err: any) {
      console.error("Upload error:", err);
      return { success: false, error: err.message };
    }
  }, // 👈 IMPORTANT COMMA FIXED HERE ✅

  async updateInvoiceStatus(id: string, status: Invoice['status']): Promise<Invoice> {
    const res = await fetch(`${API_BASE_URL}/invoices/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return handleResponse(res);
  },

  // ----------------- VENDORS -----------------
  async getVendors(): Promise<Vendor[]> {
    const res = await fetch(`${API_BASE_URL}/vendors`);
    return handleResponse(res);
  },

  async getVendor(id: string): Promise<Vendor> {
    const res = await fetch(`${API_BASE_URL}/vendors/${id}`);
    return handleResponse(res);
  },

  async getVendorInvoices(vendorId: string): Promise<Invoice[]> {
    const res = await fetch(`${API_BASE_URL}/vendors/${vendorId}/invoices`);
    return handleResponse(res);
  },

  // ----------------- DASHBOARD -----------------
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const res = await fetch(`${API_BASE_URL}/dashboard/metrics`);
    return handleResponse(res);
  },

  async getChartData(period: TimePeriod): Promise<ChartData[]> {
    const res = await fetch(`${API_BASE_URL}/dashboard/invoices?period=${period}`);
    return handleResponse(res);
  },

  async getVendorSpendData(): Promise<ChartData[]> {
    const res = await fetch(`${API_BASE_URL}/dashboard/vendor-spend`);
    return handleResponse(res);
  },

  async getInvoiceStatusData(): Promise<ChartData[]> {
    const res = await fetch(`${API_BASE_URL}/dashboard/invoice-status`);
    return handleResponse(res);
  },

  async getSourceTypeData(): Promise<ChartData[]> {
    const res = await fetch(`${API_BASE_URL}/dashboard/source-types`);
    return handleResponse(res);
  },

  // ----------------- AI PROCESSING -----------------
  async processWithAI(invoiceId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/process/${invoiceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI Processing failed:", errorText);
        return { success: false, error: errorText || "AI Processing failed" };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (err: any) {
      console.error("AI API error:", err);
      return { success: false, error: err.message };
    }
  },
};
