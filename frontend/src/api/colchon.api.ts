import apiClient from "./client";

export interface ColchonPago {
  id: number;
  colchon_prestamo_id: number;
  amount: number;
  payment_method: string;
  payment_date: string;
  notes: string | null;
  user_name: string;
  created_at: string | null;
}

export interface ColchonPrestamo {
  id: number;
  person_name: string;
  amount: number;
  remaining: number;
  payment_method: string;
  description: string;
  status: string;
  notes: string | null;
  user_name: string;
  total_pagado: number;
  pagos: ColchonPago[];
  created_at: string | null;
  updated_at: string | null;
}

export interface ColchonResumen {
  monto_base: number;
  saldo_disponible: number;
  total_prestado: number;
  total_pendiente: number;
  total_pagado: number;
  prestamos_activos: number;
  prestamos_pagados: number;
}

export interface ColchonPrestamoCreate {
  person_name: string;
  amount: number;
  payment_method: string;
  description: string;
  notes?: string;
}

export interface ColchonPagoCreate {
  amount: number;
  payment_method: string;
  payment_date?: string;
  notes?: string;
}

export const colchonApi = {
  getConfig: async (): Promise<{ monto_base: number }> => {
    const response = await apiClient.get("/colchon/config");
    return response.data;
  },

  updateMontoBase: async (monto_base: number): Promise<{ message: string; monto_base: number }> => {
    const response = await apiClient.put("/colchon/config", { monto_base });
    return response.data;
  },

  getResumen: async (): Promise<ColchonResumen> => {
    const response = await apiClient.get("/colchon/resumen");
    return response.data;
  },

  list: async (search = "", status = ""): Promise<ColchonPrestamo[]> => {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (status) params.status = status;
    const response = await apiClient.get("/colchon", { params });
    return response.data;
  },

  create: async (data: ColchonPrestamoCreate): Promise<ColchonPrestamo> => {
    const response = await apiClient.post("/colchon", data);
    return response.data;
  },

  registrarPago: async (prestamoId: number, data: ColchonPagoCreate): Promise<{ message: string; pago_id: number }> => {
    const response = await apiClient.post(`/colchon/${prestamoId}/pagos`, data);
    return response.data;
  },

  delete: async (id: number): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/colchon/${id}`);
    return response.data;
  },
};
