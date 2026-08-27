import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { authApi } from "@/api/auth.api";
import type { LoginRequest } from "@/api/types";
import { useNavigate } from "react-router-dom";

export function useAuth() {
  const { setAuth, logout, user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: currentUser, isLoading } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: authApi.getMe,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  const loginMutation = useMutation({
    mutationFn: (data: LoginRequest) => authApi.login(data),
    onSuccess: async (data) => {
      localStorage.setItem("token", data.access_token);
      const me = await authApi.getMe();
      setAuth(data.access_token, me);
      navigate("/");
    },
  });

  const logoutHandler = () => {
    logout();
    queryClient.clear();
    navigate("/login");
  };

  return {
    user: currentUser || user,
    isAuthenticated,
    isLoading,
    login: loginMutation.mutate,
    loginError: loginMutation.error,
    isLoginLoading: loginMutation.isPending,
    logout: logoutHandler,
  };
}
