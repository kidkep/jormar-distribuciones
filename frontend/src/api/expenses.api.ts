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
}

export const expensesApi = {
  list: async (page = 1, size = 50, search = ""): Promise<Expense[]> => {
    const response = await apiClient.get("/expenses", { params: { page, size, search } });
    return response.data;
  },

  create: async (data: ExpenseCreate): Promise<Expense> => {
    const response = await apiClient.post("/expenses", data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/expenses/${id}`);
  },

  getTotal: async (): Promise<{ total: number }> => {
    const response = await apiClient.get("/expenses/total");
    return response.data;
  },
};
