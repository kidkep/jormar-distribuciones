import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/api/dashboard.api";
import { tasksApi } from "@/api/tasks.api";
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
  ListTodo,
  Boxes,
  ArrowRight,
  HandCoins,
} from "lucide-react";

export function DashboardPage() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: dashboardApi.getStats,
    staleTime: 60000,
  });

  const isAdmin = user?.is_superuser;
  const perms = user?.permissions ?? [];
  const canSeeLowStock = isAdmin || perms.includes("productos.view");
  const canSeeTasks = isAdmin || perms.includes("tareas.view");

  const { data: lowStock = [] } = useQuery({
    queryKey: ["dashboard-low-stock"],
    queryFn: dashboardApi.lowStock,
    enabled: canSeeLowStock,
  });

  const { data: overdueReminders = [] } = useQuery({
    queryKey: ["tasks-overdue"],
    queryFn: tasksApi.overdue,
    enabled: canSeeTasks,
  });

  const firstName = user?.full_name?.trim()?.split(" ")[0] || user?.username || "";

  return (
    <div className="space-y-6">
      {/* Header de bienvenida */}
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          {firstName ? `Hola, ${firstName} ` : "Dashboard "}
          <span className="text-gold-600">👋</span>
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Así va el estado de tu negocio hoy.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border bg-white p-6 shadow-sm">
              <div className="h-4 w-24 rounded bg-gray-200" />
              <div className="mt-3 h-8 w-32 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      ) : stats ? (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              delay="animate-fade-up"
              label="Ventas Hoy"
              value={formatCurrency(stats.sales_today)}
              sub={`${stats.sales_count_today} ventas`}
              icon={ShoppingCart}
              gradient="from-gold-400 to-gold-600"
              iconBg="bg-gradient-to-br from-gold-400 to-gold-600 text-neutral-950"
            />
            <StatCard
              delay="animate-fade-up-delay-1"
              label="Ventas Mes"
              value={formatCurrency(stats.sales_month)}
              sub={`${stats.sales_count_month} ventas`}
              icon={TrendingUp}
              gradient="from-emerald-400 to-emerald-600"
              iconBg="bg-gradient-to-br from-emerald-400 to-emerald-600 text-white"
            />
            <StatCard
              delay="animate-fade-up-delay-2"
              label="Deudores"
              value={formatCurrency(stats.total_debt_balance)}
              sub="Saldo pendiente"
              icon={HandCoins}
              valueColor="text-red-600"
              gradient="from-orange-400 to-orange-600"
              iconBg="bg-gradient-to-br from-orange-400 to-orange-600 text-white"
            />
            <StatCard
              delay="animate-fade-up-delay-3"
              label="Bajo Stock"
              value={String(stats.low_stock_products)}
              sub="Requieren reabastecimiento"
              icon={AlertCircle}
              valueColor="text-amber-600"
              gradient="from-amber-400 to-amber-600"
              iconBg="bg-gradient-to-br from-amber-400 to-amber-600 text-white"
            />
          </div>

          {/* Mini stats */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <MiniStat label="Productos" value={String(stats.total_products)} icon={Package} iconColor="bg-gold-100 text-gold-600" />
            <MiniStat label="Clientes" value={String(stats.total_clients)} icon={Users} iconColor="bg-purple-100 text-purple-600" />
            <MiniStat label="Proveedores" value={String(stats.total_suppliers)} icon={Truck} iconColor="bg-teal-100 text-teal-600" />
          </div>

          {/* Últimas ventas */}
          {stats.recent_sales.length > 0 && (
            <div className="card-premium animate-scale-in p-0 overflow-hidden">
              <div className="flex items-center justify-between px-6 pt-5 pb-3">
                <h2 className="text-lg font-semibold text-gray-900">Últimas Ventas</h2>
                <Link to="/ventas/nueva" className="inline-flex items-center gap-1 text-sm font-medium text-gold-600 hover:text-gold-700">
                  Ver ventas <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="table-premium w-full text-sm">
                  <thead>
                    <tr className="text-xs uppercase">
                      <th className="px-6 py-3 text-left">Remisión</th>
                      <th className="px-6 py-3 text-left">Fecha</th>
                      <th className="px-6 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recent_sales.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3 font-mono text-xs font-bold text-gold-700">{s.invoice_number}</td>
                        <td className="px-6 py-3 text-gray-600">{formatDate(s.sale_date)}</td>
                        <td className="px-6 py-3 text-right font-semibold text-gray-900">{formatCurrency(s.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : null}

      {/* Alertas */}
      {(canSeeLowStock && lowStock.length > 0) || (canSeeTasks && overdueReminders.length > 0) ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {canSeeLowStock && lowStock.length > 0 && (
            <div className="card-premium border-l-4 border-l-amber-500 p-5">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                  <Boxes className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-amber-800">Productos Bajo Stock</h2>
                  <p className="text-xs text-amber-600">Requieren reposición</p>
                </div>
              </div>
              <div className="space-y-2">
                {lowStock.slice(0, 6).map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-sm">
                    <span className="font-medium text-gray-800">{p.name}</span>
                    <span className="font-semibold text-amber-700">Stock: {p.current_stock} / Min: {p.min_stock}</span>
                  </div>
                ))}
                {lowStock.length > 6 && (
                  <Link to="/productos" className="block text-right text-xs font-medium text-amber-700 hover:underline">
                    Ver más ({lowStock.length})
                  </Link>
                )}
              </div>
            </div>
          )}
          {canSeeTasks && overdueReminders.length > 0 && (
            <div className="card-premium border-l-4 border-l-red-500 p-5">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 text-red-600">
                  <ListTodo className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-red-800">Recordatorios Vencidos</h2>
                  <p className="text-xs text-red-600">Tareas de deudores pendientes</p>
                </div>
              </div>
              <div className="space-y-2">
                {overdueReminders.slice(0, 6).map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 text-sm">
                    <span className="font-medium text-gray-800">{r.title}</span>
                    <span className="font-semibold text-red-600">Vence: {formatDate(r.due_date)}</span>
                  </div>
                ))}
                {overdueReminders.length > 6 && (
                  <Link to="/tareas" className="block text-right text-xs font-medium text-red-700 hover:underline">
                    Ver más ({overdueReminders.length})
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Accesos rápidos */}
      <div className="animate-fade-up-delay-2">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Accesos Rápidos</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <QuickLink to="/ventas/nueva" icon={ShoppingCart} label="Nueva Venta" />
          <QuickLink to="/productos" icon={Package} label="Productos" />
          <QuickLink to="/cotizaciones" icon={FileText} label="Cotizaciones" />
          <QuickLink to="/deudores" icon={AlertCircle} label="Deudores" />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  iconBg,
  valueColor = "text-gray-900",
  delay = "",
  gradient,
}: {
  label: string;
  value: string;
  sub: string;
  icon: typeof ShoppingCart;
  iconBg: string;
  valueColor?: string;
  delay?: string;
  gradient?: string;
}) {
  return (
    <div className={`card-premium stat-card p-6 ${delay}`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className={`mt-2 text-2xl font-bold ${valueColor}`}>{value}</p>
          <p className="mt-1 text-xs text-gray-500">{sub}</p>
        </div>
        <div className={`stat-icon ${iconBg} shrink-0 shadow-lg`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon: Icon,
  iconColor,
}: {
  label: string;
  value: string;
  icon: typeof Package;
  iconColor: string;
}) {
  return (
    <div className="card-premium flex items-center gap-3 p-5">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconColor}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm text-gray-600">{label}</p>
        <p className="text-lg font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function QuickLink({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: typeof Package;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="group flex flex-col items-start gap-3 rounded-2xl border border-white/60 bg-gradient-to-br from-neutral-800 to-neutral-900 p-4 text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold-500/15 text-gold-400 transition-transform group-hover:scale-110">
        <Icon className="h-5 w-5" />
      </div>
      <span className="font-medium">{label}</span>
    </Link>
  );
}
