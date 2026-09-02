import apiClient from "./client";
import type { LoginRequest, TokenResponse, User } from "./types";

export const authApi = {
  login: async (data: LoginRequest): Promise<TokenResponse> => {
    const response = await apiClient.post("/auth/login", data);
    return response.data;
  },

  getMe: async (): Promise<User> => {
    const response = await apiClient.get("/auth/me");
    return response.data;
  },

  changePassword: async (data: {
    current_password: string;
    new_password: string;
  }): Promise<void> => {
    await apiClient.put("/auth/me/password", data);
  },

  updateTheme: async (theme: string): Promise<User> => {
    const response = await apiClient.put("/auth/me/theme", { theme });
    return response.data;
  },
};
