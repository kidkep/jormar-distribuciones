import apiClient from "./client";

export interface HealthCheckEntry {
  id: number;
  status: string;
  latency_ms: number | null;
  created_at: string;
}

export interface HealthStatus {
  status: string;
  database: string;
  latency_ms: number | null;
  checked_at: string;
  uptime_today: number | null;
  uptime_7d: number | null;
  recent_checks: HealthCheckEntry[];
}

export const monitorApi = {
  getStatus: async (): Promise<HealthStatus> => {
    const response = await apiClient.get("/health/status");
    return response.data;
  },
};