import apiClient from "./client";

export interface StockMovement {
  id: number;
  product_id: number;
  product_name?: string | null;
  user_id: number;
  movement_type: string;
  quantity: number;
  stock_before: number;
  stock_after: number;
  reason: string | null;
  movement_date: string;
  created_at: string;
}

export interface StockAdjustCreate {
  product_id: number;
  quantity: number;
  adjustment_type: string;
  reason?: string;
}

export const stockApi = {
  list: async (page = 1, size = 50): Promise<StockMovement[]> => {
    const response = await apiClient.get("/inventory/movements", { params: { page, size } });
    return response.data;
  },
  adjust: async (data: StockAdjustCreate): Promise<StockMovement> => {
    const response = await apiClient.post("/inventory/adjust", data);
    return response.data;
  },
};
