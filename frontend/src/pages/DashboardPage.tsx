import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/api/dashboard.api";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ShoppingCart,
  Package,
  Users,
  Truck,
  TrendingUp,
  AlertCircle,
  DollarSign,
  FileText,
} from "lucide-react";

export function DashboardPage() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: dashboardApi.getStats,
    staleTime: 60000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Bienvenido, {user?.full_name || user?.username}</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border bg-white p-6 shadow-sm">
              <div className="h-4 w-24 rounded bg-gray-200" />
              <div className="mt-2 h-8 w-32 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ventas Hoy</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(stats.sales_today)}</p>
                  <p className="mt-1 text-xs text-gray-500">{stats.sales_count_today} ventas</p>
                </div>
                <div className="rounded-lg bg-blue-500 p-3"><ShoppingCart className="h-6 w-6 text-white" /></div>
              </div>
            </div>

            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ventas Mes</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(stats.sales_month)}</p>
                  <p className="mt-1 text-xs text-gray-500">{stats.sales_count_month} ventas</p>
                </div>
                <div className="rounded-lg bg-green-500 p-3"><TrendingUp className="h-6 w-6 text-white" /></div>
              </div>
            </div>

            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Deudores</p>
                  <p className="mt-1 text-2xl font-bold text-red-600">{formatCurrency(stats.total_debt_balance)}</p>
                  <p className="mt-1 text-xs text-gray-500">Saldo pendiente</p>
                </div>
                <div className="rounded-lg bg-orange-500 p-3"><DollarSign className="h-6 w-6 text-white" /></div>
              </div>
            </div>

            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Productos Bajo Stock</p>
                  <p className="mt-1 text-2xl font-bold text-amber-600">{stats.low_stock_products}</p>
                  <p className="mt-1 text-xs text-gray-500">Requieren reabastecimiento</p>
                </div>
                <div className="rounded-lg bg-amber-500 p-3"><AlertCircle className="h-6 w-6 text-white" /></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2"><Package className="h-5 w-5 text-blue-600" /></div>
                <div><p className="text-sm text-gray-600">Productos</p><p className="text-lg font-bold">{stats.total_products}</p></div>
              </div>
            </div>
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-purple-100 p-2"><Users className="h-5 w-5 text-purple-600" /></div>
                <div><p className="text-sm text-gray-600">Clientes</p><p className="text-lg font-bold">{stats.total_clients}</p></div>
              </div>
            </div>
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-teal-100 p-2"><Truck className="h-5 w-5 text-teal-600" /></div>
                <div><p className="text-sm text-gray-600">Proveedores</p><p className="text-lg font-bold">{stats.total_suppliers}</p></div>
              </div>
            </div>
          </div>

          {stats.recent_sales.length > 0 && (
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Ultimas Ventas</h2>
              <table className="w-full text-sm">
                <thead className="border-b text-xs uppercase text-gray-600">
                  <tr>
                    <th className="px-3 py-2 text-left">Factura</th>
                    <th className="px-3 py-2 text-left">Fecha</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {stats.recent_sales.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-xs font-bold">{s.invoice_number}</td>
                      <td className="px-3 py-2">{formatDate(s.sale_date)}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatCurrency(s.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}

      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Accesos Rapidos</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Link to="/ventas/nueva" className="flex items-center gap-3 rounded-xl bg-blue-600 p-4 text-white shadow-sm transition-colors hover:bg-blue-700">
            <ShoppingCart className="h-6 w-6" />
            <span className="font-medium">Nueva Venta</span>
          </Link>
          <Link to="/productos" className="flex items-center gap-3 rounded-xl bg-green-600 p-4 text-white shadow-sm transition-colors hover:bg-green-700">
            <Package className="h-6 w-6" />
            <span className="font-medium">Productos</span>
          </Link>
          <Link to="/cotizaciones" className="flex items-center gap-3 rounded-xl bg-purple-600 p-4 text-white shadow-sm transition-colors hover:bg-purple-700">
            <FileText className="h-6 w-6" />
            <span className="font-medium">Cotizar</span>
          </Link>
          <Link to="/deudores" className="flex items-center gap-3 rounded-xl bg-orange-600 p-4 text-white shadow-sm transition-colors hover:bg-orange-700">
            <AlertCircle className="h-6 w-6" />
            <span className="font-medium">Deudores</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
