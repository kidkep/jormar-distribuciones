import apiClient from "./client";

export interface Category {
  id: number;
  name: string;
  description: string | null;
  parent_id: number | null;
  is_active: boolean;
  created_at: string;
}

export interface Unit {
  id: number;
  name: string;
  abbreviation: string;
  is_active: boolean;
  created_at: string;
}

export const catalogApi = {
  getCategories: async (): Promise<Category[]> => {
    const response = await apiClient.get("/catalog/categories");
    return response.data;
  },

  createCategory: async (data: { name: string; description?: string }): Promise<Category> => {
    const response = await apiClient.post("/catalog/categories", data);
    return response.data;
  },

  deleteCategory: async (id: number): Promise<void> => {
    await apiClient.delete(`/catalog/categories/${id}`);
  },

  getUnits: async (): Promise<Unit[]> => {
    const response = await apiClient.get("/catalog/units");
    return response.data;
  },

  createUnit: async (data: { name: string; abbreviation: string }): Promise<Unit> => {
    const response = await apiClient.post("/catalog/units", data);
    return response.data;
  },

  deleteUnit: async (id: number): Promise<void> => {
    await apiClient.delete(`/catalog/units/${id}`);
  },
};
