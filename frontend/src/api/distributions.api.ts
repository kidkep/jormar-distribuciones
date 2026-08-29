import apiClient from "./client";

export interface DistributionItem {
  id: number;
  sale_id: number;
  sale_date: string;
  sale_total: number;
  monto_recibido: number;
  pct_utilidad: number;
  pct_gastos: number;
  pct_inversion: number;
  monto_utilidad: number;
  monto_gastos: number;
  monto_inversion: number;
  invoice_number: string;
  client_name: string | null;
  payment_method: string;
  status: string;
  created_at: string;
}

export interface DistributionSummary {
  total_ventas: number;
  total_utilidad: number;
  total_gastos: number;
  total_inversion: number;
  count_ventas: number;
  pct_utilidad: number;
  pct_gastos: number;
  pct_inversion: number;
}

export interface DistributionConfig {
  pct_utilidad: number;
  pct_gastos: number;
  pct_inversion: number;
}

export const distributionsApi = {
  getAll: async (page = 1, size = 50): Promise<DistributionItem[]> => {
    const response = await apiClient.get("/distributions", {
      params: { page, size },
    });
    return response.data;
  },

  getSummary: async (
    fechaInicio?: string,
    fechaFin?: string
  ): Promise<DistributionSummary> => {
    const params: Record<string, string> = {};
    if (fechaInicio) params.fecha_inicio = fechaInicio;
    if (fechaFin) params.fecha_fin = fechaFin;
    const response = await apiClient.get("/distributions/summary", { params });
    return response.data;
  },

  getConfig: async (): Promise<DistributionConfig> => {
    const response = await apiClient.get("/distributions/config");
    return response.data;
  },
};
