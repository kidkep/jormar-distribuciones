import apiClient from "./client";

export interface PrestamoPago {
  id: number;
  prestamo_id: number;
  amount: number;
  payment_method: string;
  payment_date: string;
  notes: string | null;
  user_name: string;
  created_at: string | null;
}

export interface Prestamo {
  id: number;
  person_name: string;
  amount: number;
  remaining: number;
  distribution_category: string;
  payment_method: string;
  description: string;
  status: string;
  reference: string | null;
  notes: string | null;
  user_name: string;
  total_pagado: number;
  pagos: PrestamoPago[];
  created_at: string | null;
  updated_at: string | null;
}

export interface PrestamoResumen {
  total_prestado: number;
  total_pendiente: number;
  total_pagado: number;
  prestamos_activos: number;
  prestamos_pagados: number;
}

export interface PrestamoCreate {
  person_name: string;
  amount: number;
  distribution_category: string;
  payment_method: string;
  description: string;
  reference?: string;
  notes?: string;
}

export interface PrestamoPagoCreate {
  amount: number;
  payment_method: string;
  payment_date?: string;
  notes?: string;
}

export const prestamosApi = {
  list: async (page = 1, size = 50, search = "", status = ""): Promise<Prestamo[]> => {
    const params: Record<string, string | number> = { page, size };
    if (search) params.search = search;
    if (status) params.status = status;
    const response = await apiClient.get("/prestamos", { params });
    return response.data;
  },

  getResumen: async (): Promise<PrestamoResumen> => {
    const response = await apiClient.get("/prestamos/resumen");
    return response.data;
  },

  get: async (id: number): Promise<Prestamo> => {
    const response = await apiClient.get(`/prestamos/${id}`);
    return response.data;
  },

  create: async (data: PrestamoCreate): Promise<Prestamo> => {
    const response = await apiClient.post("/prestamos", data);
    return response.data;
  },

  registrarPago: async (prestamoId: number, data: PrestamoPagoCreate): Promise<{ message: string; pago_id: number }> => {
    const response = await apiClient.post(`/prestamos/${prestamoId}/pagos`, data);
    return response.data;
  },

  delete: async (id: number): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/prestamos/${id}`);
    return response.data;
  },
};
