import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { authApi } from "@/api/auth.api";
import { applyTheme } from "@/lib/theme";

export function useTheme() {
  const { user, setUser } = useAuthStore();

  useEffect(() => {
    if (user?.theme) {
      applyTheme(user.theme);
    }
  }, [user?.theme]);

  const setTheme = async (theme: string) => {
    applyTheme(theme);
    const updated = await authApi.updateTheme(theme);
    setUser(updated);
  };

  return { theme: user?.theme ?? "gold", setTheme };
}
