import apiClient from "./client";
import type { Permission, Role, RoleCreate, RoleUpdate } from "./types";

export const rolesApi = {
  list: async (): Promise<Role[]> => {
    const response = await apiClient.get("/roles");
    return response.data;
  },

  get: async (id: number): Promise<Role> => {
    const response = await apiClient.get(`/roles/${id}`);
    return response.data;
  },

  allPermissions: async (): Promise<Permission[]> => {
    const response = await apiClient.get("/roles/permissions/all");
    return response.data;
  },

  create: async (data: RoleCreate): Promise<Role> => {
    const response = await apiClient.post("/roles", data);
    return response.data;
  },

  update: async (id: number, data: RoleUpdate): Promise<Role> => {
    const response = await apiClient.put(`/roles/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/roles/${id}`);
  },
};
