import apiClient from "./client";

export interface Payment {
  id: number;
  sale_id: number;
  amount: number;
  payment_method: string;
  payment_date: string;
  notes: string | null;
  created_at: string;
}

export interface Debtor {
  sale_id: number;
  invoice_number: string;
  sale_date: string;
  client_id: number | null;
  client_name: string | null;
  client_document: string | null;
  total: number;
  total_paid: number;
  balance: number;
  items: { product_name: string; sku: string; quantity: number; unit_price: number; total_price: number }[];
  payments: Payment[];
}

export interface PaymentCreate {
  amount: number;
  payment_method?: string;
  payment_date?: string;
  notes?: string;
}

export const debtorsApi = {
  list: async (page = 1, size = 50): Promise<Debtor[]> => {
    const response = await apiClient.get("/debtors", { params: { page, size } });
    return response.data;
  },

  registerPayment: async (saleId: number, data: PaymentCreate): Promise<Payment> => {
    const response = await apiClient.post(`/debtors/${saleId}/payments`, data);
    return response.data;
  },
};
