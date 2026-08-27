import apiClient from "./client";

export interface Client {
  id: number;
  document_type: string;
  document_number: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  credit_limit: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientCreate {
  document_type?: string;
  document_number: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  credit_limit?: number;
  notes?: string;
}

export const clientsApi = {
  list: async (page = 1, size = 50, search = ""): Promise<Client[]> => {
    const response = await apiClient.get("/clients", { params: { page, size, search } });
    return response.data;
  },

  get: async (id: number): Promise<Client> => {
    const response = await apiClient.get(`/clients/${id}`);
    return response.data;
  },

  create: async (data: ClientCreate): Promise<Client> => {
    const response = await apiClient.post("/clients", data);
    return response.data;
  },

  update: async (id: number, data: Partial<ClientCreate>): Promise<Client> => {
    const response = await apiClient.put(`/clients/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/clients/${id}`);
  },
};
