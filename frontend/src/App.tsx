import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";
import { AdminRoute } from "@/components/common/AdminRoute";
import { PermissionRoute } from "@/components/common/PermissionRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoginPage } from "@/pages/LoginPage";
import { WelcomePage } from "@/pages/WelcomePage";
import { DashboardPage } from "@/pages/DashboardPage";
import { ProductsPage } from "@/pages/ProductsPage";
import { ClientsPage } from "@/pages/ClientsPage";
import { SuppliersPage } from "@/pages/SuppliersPage";
import { PurchaseOrdersPage } from "@/pages/PurchaseOrdersPage";
import { SalesPage } from "@/pages/SalesPage";
import { QuotesPage } from "@/pages/QuotesPage";
import { DebtorsPage } from "@/pages/DebtorsPage";
import { ExpensesPage } from "@/pages/ExpensesPage";
import { TasksPage } from "@/pages/TasksPage";
import { DineroPage } from "@/pages/DineroPage";
import { DistribucionPage } from "@/pages/DistribucionPage";
import { BalancePage } from "@/pages/BalancePage";
import { ConfigPage } from "@/pages/ConfigPage";
import { UsersPage } from "@/pages/UsersPage";
import { RolesPage } from "@/pages/RolesPage";
import { AuditLogPage } from "@/pages/AuditLogPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { useEffect } from "react";
import { applyTheme } from "@/lib/theme";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AppRoutes() {
  const { loadFromStorage, isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    if (user?.theme) {
      applyTheme(user.theme);
    }
  }, [user?.theme]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<WelcomePage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="productos" element={<ProductsPage />} />
        <Route path="clientes" element={<ClientsPage />} />
        <Route path="proveedores" element={<SuppliersPage />} />
        <Route path="pedidos-proveedores" element={<PermissionRoute permission="compras.view"><PurchaseOrdersPage /></PermissionRoute>} />
        <Route path="ventas/nueva" element={<SalesPage />} />
        <Route path="cotizaciones" element={<QuotesPage />} />
        <Route path="deudores" element={<DebtorsPage />} />
        <Route path="gastos" element={<ExpensesPage />} />
        <Route path="tareas" element={<TasksPage />} />
        <Route path="dinero" element={<DineroPage />} />
        <Route path="distribucion" element={<DistribucionPage />} />
        <Route path="balance" element={<BalancePage />} />
        <Route path="configuracion" element={<ConfigPage />} />
        <Route
          path="usuarios"
          element={
            <AdminRoute>
              <UsersPage />
            </AdminRoute>
          }
        />
        <Route
          path="roles"
          element={
            <AdminRoute>
              <RolesPage />
            </AdminRoute>
          }
        />
        <Route
          path="historial"
          element={
            <AdminRoute>
              <AuditLogPage />
            </AdminRoute>
          }
        />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
