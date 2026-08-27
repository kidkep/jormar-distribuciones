import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "./LoadingSpinner";

interface Props {
  children: React.ReactNode;
}

export function AdminRoute({ children }: Props) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!user?.is_superuser) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
