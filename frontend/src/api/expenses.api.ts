import apiClient from "./client";

export interface Expense {
  id: number;
  description: string;
  amount: number;
  category: string;
  expense_date: string;
  payment_method: string;
  reference: string | null;
  notes: string | null;
  distribution_category: string;
  retiro_id: number | null;
  user_id: number;
  created_at: string;
  updated_at: string;
}

export interface ExpenseCreate {
  description: string;
  amount: number;
  category?: string;
  expense_date?: string;
  payment_method?: string;
  reference?: string;
  notes?: string;
  distribution_category?: string;
}

export const expensesApi = {
  list: async (page = 1, size = 50, search = "", distributionCategory = ""): Promise<Expense[]> => {
    const params: Record<string, string | number> = { page, size, search };
    if (distributionCategory) params.distribution_category = distributionCategory;
    const response = await apiClient.get("/expenses", { params });
    return response.data;
  },

  create: async (data: ExpenseCreate): Promise<Expense> => {
    const response = await apiClient.post("/expenses", data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/expenses/${id}`);
  },

  getTotal: async (): Promise<{ total: number; por_distribucion: Record<string, number> }> => {
    const response = await apiClient.get("/expenses/total");
    return response.data;
  },
};
