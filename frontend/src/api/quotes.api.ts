import apiClient from "./client";

export interface QuoteItem {
  id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  product: { id: number; name: string; sku: string } | null;
}

export interface Quote {
  id: number;
  quote_number: string;
  quote_date: string;
  valid_until: string | null;
  client_id: number | null;
  client: { id: number; name: string } | null;
  client_name: string | null;
  user_id: number;
  subtotal: number;
  tax_amount: number;
  discount: number;
  total: number;
  status: string;
  notes: string | null;
  items: QuoteItem[];
  created_at: string;
  updated_at: string;
}

export interface QuoteItemCreate {
  product_id: number;
  quantity: number;
  unit_price: number;
}

export interface QuoteCreate {
  client_id?: number | null;
  client_name?: string | null;
  quote_date?: string;
  valid_until?: string;
  discount?: number;
  notes?: string;
  items: QuoteItemCreate[];
}

export const quotesApi = {
  list: async (page = 1, size = 50, search = ""): Promise<Quote[]> => {
    const response = await apiClient.get("/quotes", { params: { page, size, search } });
    return response.data;
  },

  get: async (id: number): Promise<Quote> => {
    const response = await apiClient.get(`/quotes/${id}`);
    return response.data;
  },

  create: async (data: QuoteCreate): Promise<Quote> => {
    const response = await apiClient.post("/quotes", data);
    return response.data;
  },

  updateStatus: async (id: number, status: string): Promise<Quote> => {
    const response = await apiClient.put(`/quotes/${id}/status?status=${status}`);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/quotes/${id}`);
  },
};
