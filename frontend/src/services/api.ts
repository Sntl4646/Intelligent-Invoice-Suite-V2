// API service layer - connected to Python FastAPI backend

import { Invoice, Vendor, DashboardMetrics, ChartData, TimePeriod } from '@/types/invoice';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Simple helper
const handleResponse = async (res: Response) => {
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

// Helper to get auth token from localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem('access_token');
};

// Helper to add auth headers
const getAuthHeaders = (): HeadersInit => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

export const api = {
  // ----------------- AUTHENTICATION -----------------
  async register(email: string, password: string): Promise<{ status: string; email: string }> {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return handleResponse(res);
  },

  async login(email: string, password: string): Promise<{ access_token: string; token_type: string; model: string }> {
    const formData = new URLSearchParams();
    formData.append('email', email);
    formData.append('password', password);

    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData
    });
    
    const data = await handleResponse(res);
    
    // Store token in localStorage
    if (data.access_token) {
      localStorage.setItem('access_token', data.access_token);
    }
    
    return data;
  },

  async getCurrentUser(): Promise<{ email: string; is_admin: boolean; preferred_model: string }> {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  logout() {
    localStorage.removeItem('access_token');
  },

  // ----------------- INVOICES -----------------
  async getInvoices(): Promise<Invoice[]> {
    const res = await fetch(`${API_BASE_URL}/invoices/list`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getInvoice(id: string): Promise<Invoice> {
    const res = await fetch(`${API_BASE_URL}/invoices/${id}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async updateInvoiceStatus(id: string, status: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/invoices/${id}/status?status=${status}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update invoice status');
    }
    
    return response.json();
  },

  async uploadInvoice(file: File): Promise<{ success: boolean; invoice?: Invoice; error?: string }> {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const token = getAuthToken();
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/invoices/upload`, {
        method: "POST",
        headers,
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
  },

  // ----------------- VENDORS -----------------
  async getVendors(): Promise<Vendor[]> {
    const res = await fetch(`${API_BASE_URL}/vendors/list`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getVendor(id: string): Promise<Vendor> {
    const res = await fetch(`${API_BASE_URL}/vendors/${id}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getVendorInvoices(vendorId: string): Promise<Invoice[]> {
    const res = await fetch(`${API_BASE_URL}/vendors/${vendorId}/invoices`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  // ----------------- DASHBOARD -----------------
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const res = await fetch(`${API_BASE_URL}/dashboard/summary`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getChartData(period: TimePeriod): Promise<ChartData[]> {
    const res = await fetch(`${API_BASE_URL}/dashboard/invoices?period=${period}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getVendorSpendData(): Promise<ChartData[]> {
    const res = await fetch(`${API_BASE_URL}/dashboard/vendor-spend`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getInvoiceStatusData(): Promise<ChartData[]> {
    const res = await fetch(`${API_BASE_URL}/dashboard/invoice-status`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getSourceTypeData(): Promise<ChartData[]> {
    const res = await fetch(`${API_BASE_URL}/dashboard/source-types`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  // ----------------- AI PROCESSING -----------------
  async processWithAI(invoiceId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/process/${invoiceId}`, {
        method: "POST",
        headers: getAuthHeaders(),
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

  async queryWithAI(query: string, model_choice: string = 'gpt4'): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/query`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ query, model_choice }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI Query failed:", errorText);
        return { success: false, error: errorText || "AI Query failed" };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (err: any) {
      console.error("AI Query error:", err);
      return { success: false, error: err.message };
    }
  },

  // ----------------- SETTINGS -----------------
  async getSettings(): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/settings/config`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async updateSettings(settings: any): Promise<{ success: boolean; message: string; updatedFields: string[] }> {
    const res = await fetch(`${API_BASE_URL}/settings/config`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(settings)
    });
    return handleResponse(res);
  },

  async getIntegrations(): Promise<any[]> {
    const res = await fetch(`${API_BASE_URL}/settings/integrations`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async connectIntegration(id: string, credentials?: any): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE_URL}/settings/integrations/${id}/connect`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(credentials || {})
    });
    return handleResponse(res);
  },

  async disconnectIntegration(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE_URL}/settings/integrations/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getApiKeys(): Promise<{ openai: string; google: string; databaseUrl: string }> {
    const res = await fetch(`${API_BASE_URL}/settings/api-keys`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getAvailableModels(): Promise<{ models: any[]; current: string }> {
    const res = await fetch(`${API_BASE_URL}/settings/available-models`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async updatePreferredModel(model: string): Promise<{ status: string; preferred_model: string }> {
    const res = await fetch(`${API_BASE_URL}/settings/models`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ model })
    });
    return handleResponse(res);
  },

  async getPreferredModel(): Promise<{ preferred_model: string }> {
    const res = await fetch(`${API_BASE_URL}/settings/models`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },
};
