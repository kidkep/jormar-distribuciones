import apiClient from "./client";

export interface DashboardStats {
  total_products: number;
  total_clients: number;
  total_suppliers: number;
  low_stock_products: number;
  sales_today: number;
  sales_month: number;
  sales_count_today: number;
  sales_count_month: number;
  total_debt_balance: number;
  recent_sales: { id: number; invoice_number: string; total: number; sale_date: string }[];
}

export interface LowStockProduct {
  id: number;
  name: string;
  sku: string;
  current_stock: number;
  min_stock: number;
}

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get("/dashboard/stats");
    return response.data;
  },
  lowStock: async (): Promise<LowStockProduct[]> => {
    const response = await apiClient.get("/dashboard/low-stock");
    return response.data;
  },
};
