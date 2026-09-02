import apiClient from "./client";

export interface Product {
  id: number;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  category_id: number | null;
  unit_id: number | null;
  supplier_id: number | null;
  purchase_price: number;
  sale_price: number;
  tax_rate: number;
  min_stock: number;
  current_stock: number;
  is_active: boolean;
  category: { id: number; name: string } | null;
  unit: { id: number; name: string; abbreviation: string } | null;
  supplier: { id: number; name: string } | null;
  created_at: string;
  updated_at: string;
}

export interface ProductCreate {
  sku?: string;
  name: string;
  purchase_price: number;
  sale_price: number;
  current_stock?: number;
  min_stock?: number;
  category_id?: number | null;
  unit_id?: number | null;
  supplier_id?: number | null;
  description?: string;
  barcode?: string;
  tax_rate?: number;
}

export const productsApi = {
  list: async (page = 1, size = 50, search = "", status = "all"): Promise<Product[]> => {
    const response = await apiClient.get("/products", { params: { page, size, search, status } });
    return response.data;
  },

  get: async (id: number): Promise<Product> => {
    const response = await apiClient.get(`/products/${id}`);
    return response.data;
  },

  nextSku: async (): Promise<string> => {
    const response = await apiClient.get("/products/next-sku");
    return response.data.next_sku;
  },

  create: async (data: ProductCreate): Promise<Product> => {
    const response = await apiClient.post("/products", data);
    return response.data;
  },

  update: async (id: number, data: Partial<ProductCreate>): Promise<Product> => {
    const response = await apiClient.put(`/products/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/products/${id}`);
  },

  toggleStatus: async (id: number): Promise<Product> => {
    const response = await apiClient.post(`/products/${id}/toggle-status`);
    return response.data;
  },

  getLowStock: async (): Promise<Product[]> => {
    const response = await apiClient.get("/products/low-stock");
    return response.data;
  },
};
