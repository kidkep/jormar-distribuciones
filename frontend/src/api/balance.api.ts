import apiClient from "./client";

export interface BalanceData {
  periodo: { inicio: string; fin: string };
  ventas: {
    total: number;
    cantidad: number;
    ticket_promedio: number;
    por_metodo: Record<string, number>;
  };
  gastos: {
    total: number;
    cantidad: number;
    por_categoria: Record<string, number>;
  };
  abonos: { total: number; por_metodo: Record<string, number> };
  deuda: { pendiente: number };
  saldo_por_metodo: Record<string, number>;
  deudores: {
    cantidad: number;
    total_pendiente: number;
    lista: {
      sale_id: number;
      invoice_number: string;
      sale_date: string;
      client_name: string;
      client_doc: string;
      client_phone: string;
      total: number;
      total_paid: number;
      balance: number;
      items: { producto: string; cantidad: number; precio: number }[];
      pagos: { monto: number; fecha: string; metodo: string }[];
    }[];
  };
  inventario: {
    valor_compra: number;
    valor_venta: number;
    total_productos: number;
    bajo_stock: number;
  };
  clientes: { total: number };
  top_productos: { producto: string; unidades_vendidas: number; total_generado: number }[];
  ganancia: { bruta: number; margen: number };
}

export const balanceApi = {
  get: async (fechaInicio = "", fechaFin = ""): Promise<BalanceData> => {
    const params: Record<string, string> = {};
    if (fechaInicio) params.fecha_inicio = fechaInicio;
    if (fechaFin) params.fecha_fin = fechaFin;
    const response = await apiClient.get("/balance", { params });
    return response.data;
  },
};
