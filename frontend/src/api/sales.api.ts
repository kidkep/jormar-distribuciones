import apiClient from "./client";

export interface SaleItem {
  id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  product: { id: number; name: string; sku: string } | null;
}

export interface Sale {
  id: number;
  invoice_number: string;
  sale_date: string;
  client_id: number | null;
  client: { id: number; name: string } | null;
  user_id: number;
  subtotal: number;
  tax_amount: number;
  discount: number;
  total: number;
  payment_method: string;
  status: string;
  notes: string | null;
  delivery_address: string | null;
  delivered_by: string | null;
  items: SaleItem[];
  created_at: string;
  updated_at: string;
}

export interface SaleItemCreate {
  product_id: number;
  quantity: number;
  unit_price: number;
}

export interface SaleCreate {
  client_id?: number | null;
  sale_date?: string;
  payment_method?: string;
  discount?: number;
  notes?: string;
  delivery_address?: string;
  delivered_by?: string;
  items: SaleItemCreate[];
}

export const salesApi = {
  list: async (page = 1, size = 50, search = ""): Promise<Sale[]> => {
    const response = await apiClient.get("/sales", { params: { page, size, search } });
    return response.data;
  },

  get: async (id: number): Promise<Sale> => {
    const response = await apiClient.get(`/sales/${id}`);
    return response.data;
  },

  create: async (data: SaleCreate): Promise<Sale> => {
    const response = await apiClient.post("/sales", data);
    return response.data;
  },

  cancel: async (id: number): Promise<void> => {
    await apiClient.post(`/sales/${id}/cancel`);
  },
};
