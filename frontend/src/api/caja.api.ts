import apiClient from "./client";

export interface Movimiento {
  tipo: "ingreso" | "egreso";
  descripcion: string;
  monto: number;
  metodo: string;
  fecha: string;
}

export interface CajaResumen {
  ventas_hoy: number;
  ventas_mes: number;
  gastos_hoy: number;
  gastos_mes: number;
  abonos_hoy: number;
  deuda_pendiente: number;
  ganancia_neta_hoy: number;
  ganancia_neta_mes: number;
  por_metodo: Record<string, number>;
  movimientos: Movimiento[];
  saldo_total: number;
  saldo_por_metodo: Record<string, number>;
  total_retiros: number;
  distribucion: {
    utilidad: number;
    inversion: number;
    costos: number;
  };
  distribucion_totales: {
    utilidad: number;
    inversion: number;
    costos: number;
  };
}

export const cajaApi = {
  getResumen: async (): Promise<CajaResumen> => {
    const response = await apiClient.get("/caja/resumen");
    return response.data;
  },
};
