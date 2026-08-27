import apiClient from "./client";

export interface AuditLogEntry {
  id: number;
  user_id: number | null;
  username: string | null;
  full_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: string | null;
  new_values: string | null;
  ip_address: string | null;
  created_at: string;
}

export const auditApi = {
  list: async (params?: {
    page?: number;
    size?: number;
    entity_type?: string;
    action?: string;
    username?: string;
  }): Promise<AuditLogEntry[]> => {
    const response = await apiClient.get("/audit", { params });
    return response.data;
  },
};
