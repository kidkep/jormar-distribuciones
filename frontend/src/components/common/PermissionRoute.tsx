import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "./LoadingSpinner";

interface Props {
  permission: string;
  children: React.ReactNode;
}

export function PermissionRoute({ permission, children }: Props) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const allowed = user?.is_superuser || (user?.permissions ?? []).includes(permission);

  if (!allowed) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
