import apiClient from "./client";

export interface Supplier {
  id: number;
  document_type: string;
  document_number: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupplierCreate {
  document_type?: string;
  document_number: string;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  notes?: string;
}

export const suppliersApi = {
  list: async (page = 1, size = 50, search = ""): Promise<Supplier[]> => {
    const response = await apiClient.get("/suppliers", { params: { page, size, search } });
    return response.data;
  },

  get: async (id: number): Promise<Supplier> => {
    const response = await apiClient.get(`/suppliers/${id}`);
    return response.data;
  },

  create: async (data: SupplierCreate): Promise<Supplier> => {
    const response = await apiClient.post("/suppliers", data);
    return response.data;
  },

  update: async (id: number, data: Partial<SupplierCreate>): Promise<Supplier> => {
    const response = await apiClient.put(`/suppliers/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/suppliers/${id}`);
  },
};
