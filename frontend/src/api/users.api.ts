import apiClient from "./client";
import type { User, UserCreate, UserUpdate } from "./types";

export const usersApi = {
  list: async (page = 1, size = 100, search = ""): Promise<User[]> => {
    const response = await apiClient.get("/users", { params: { page, size, search } });
    return response.data;
  },

  get: async (id: number): Promise<User> => {
    const response = await apiClient.get(`/users/${id}`);
    return response.data;
  },

  create: async (data: UserCreate): Promise<User> => {
    const response = await apiClient.post("/users", data);
    return response.data;
  },

  update: async (id: number, data: UserUpdate): Promise<User> => {
    const response = await apiClient.put(`/users/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/users`, { params: { user_id: id } });
  },
};
