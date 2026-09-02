import apiClient from "./client";
import type { Supplier } from "./suppliers.api";

export interface PurchaseOrderItem {
  id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  product: { id: number; name: string; sku: string } | null;
}

export interface PurchaseOrder {
  id: number;
  order_number: string;
  order_date: string;
  expected_date: string | null;
  supplier_id: number | null;
  supplier: { id: number; name: string; document_number: string } | null;
  supplier_name: string | null;
  user_id: number;
  subtotal: number;
  tax_amount: number;
  discount: number;
  total: number;
  status: string;
  notes: string | null;
  items: PurchaseOrderItem[];
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderItemCreate {
  product_id: number;
  quantity: number;
  unit_price: number;
}

export interface PurchaseOrderCreate {
  supplier_id?: number | null;
  supplier_name?: string | null;
  order_date?: string;
  expected_date?: string;
  discount?: number;
  notes?: string;
  items: PurchaseOrderItemCreate[];
}

export const purchaseOrdersApi = {
  list: async (page = 1, size = 50, search = ""): Promise<PurchaseOrder[]> => {
    const response = await apiClient.get("/purchase-orders", { params: { page, size, search } });
    return response.data;
  },

  listSuppliers: async (): Promise<Supplier[]> => {
    const response = await apiClient.get("/purchase-orders/suppliers");
    return response.data;
  },

  get: async (id: number): Promise<PurchaseOrder> => {
    const response = await apiClient.get(`/purchase-orders/${id}`);
    return response.data;
  },

  create: async (data: PurchaseOrderCreate): Promise<PurchaseOrder> => {
    const response = await apiClient.post("/purchase-orders", data);
    return response.data;
  },

  updateStatus: async (id: number, status: string): Promise<PurchaseOrder> => {
    const response = await apiClient.put(`/purchase-orders/${id}/status?status=${status}`);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/purchase-orders/${id}`);
  },

  downloadPdf: async (id: number): Promise<void> => {
    const baseUrl = import.meta.env.VITE_API_URL || "/api/v1";
    const token = localStorage.getItem("token");
    const res = await fetch(`${baseUrl}/purchase-orders/download/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Error al descargar el PDF");
    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition") || "";
    const match = disposition.match(/filename="?([^";]+)"?/);
    const filename = match ? match[1] : "solicitud.pdf";
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
};
