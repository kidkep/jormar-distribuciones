import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { LoadingSpinner } from "./LoadingSpinner";

interface Props {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: Props) {
  const { isAuthenticated } = useAuthStore();
  const hasToken = localStorage.getItem("token");

  if (!isAuthenticated && !hasToken) {
    return <Navigate to="/login" replace />;
  }

  if (!isAuthenticated && hasToken) {
    return <LoadingSpinner />;
  }

  return <>{children}</>;
}
