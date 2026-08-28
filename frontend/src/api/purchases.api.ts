import apiClient from "./client";

export interface PurchaseItem {
  id: number;
  purchase_id: number;
  product_id: number;
  quantity: number;
  cost_price: number;
  total_price: number;
  product_name?: string | null;
}

export interface Purchase {
  id: number;
  order_number: string;
  purchase_date: string;
  supplier_id: number | null;
  supplier_name: string | null;
  user_id: number;
  subtotal: number;
  tax_amount: number;
  discount: number;
  total: number;
  status: string;
  notes: string | null;
  items: PurchaseItem[];
  created_at: string;
  updated_at: string;
}

export interface PurchaseCreate {
  supplier_id?: number | null;
  supplier_name?: string | null;
  purchase_date?: string;
  discount?: number;
  notes?: string;
  items: { product_id: number; quantity: number; cost_price: number }[];
}

export interface SupplierPayment {
  id: number;
  purchase_id: number;
  amount: number;
  payment_method: string;
  payment_date: string;
  notes: string | null;
  created_at: string;
}

export interface SupplierAccount {
  purchase_id: number;
  order_number: string;
  purchase_date: string;
  supplier_id: number | null;
  supplier_name: string | null;
  total: number;
  total_paid: number;
  balance: number;
  payments: SupplierPayment[];
}

export interface PayableSummary {
  total_debt: number;
  total_paid: number;
  total_balance: number;
  count: number;
}

export const purchasesApi = {
  list: async (page = 1, size = 50, search = ""): Promise<Purchase[]> => {
    const response = await apiClient.get("/purchases", { params: { page, size, search } });
    return response.data;
  },
  get: async (id: number): Promise<Purchase> => {
    const response = await apiClient.get(`/purchases/${id}`);
    return response.data;
  },
  create: async (data: PurchaseCreate): Promise<Purchase> => {
    const response = await apiClient.post("/purchases", data);
    return response.data;
  },
  registerPayment: async (purchaseId: number, data: { amount: number; payment_method?: string; payment_date?: string; notes?: string }): Promise<SupplierPayment> => {
    const response = await apiClient.post(`/purchases/${purchaseId}/payments`, data);
    return response.data;
  },
};

export const accountsPayableApi = {
  list: async (page = 1, size = 50, search = ""): Promise<SupplierAccount[]> => {
    const response = await apiClient.get("/accounts-payable", { params: { page, size, search } });
    return response.data;
  },
  summary: async (): Promise<PayableSummary> => {
    const response = await apiClient.get("/accounts-payable/summary");
    return response.data;
  },
};
