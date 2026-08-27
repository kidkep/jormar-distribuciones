import apiClient from "./client";

export interface Retiro {
  id: number;
  amount: number;
  source_method: string;
  description: string;
  retiro_date: string;
  reference: string | null;
  notes: string | null;
  user_name: string;
  created_at: string | null;
}

export interface RetiroCreate {
  amount: number;
  source_method: string;
  description: string;
  retiro_date: string;
  reference?: string;
  notes?: string;
}

export const retirosApi = {
  getAll: async (): Promise<Retiro[]> => {
    const response = await apiClient.get("/retiros");
    return response.data;
  },
  create: async (data: RetiroCreate): Promise<{ message: string; id: number }> => {
    const response = await apiClient.post("/retiros", data);
    return response.data;
  },
  delete: async (id: number): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/retiros/${id}`);
    return response.data;
  },
};
