import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Users,
  Truck,
  ShoppingCart,
  FileText,
  AlertCircle,
  Wallet,
  BarChart3,
  Settings,
  X,
  ExternalLink,
  ClipboardList,
  PieChart,
  UserCog,
  ShieldCheck,
  History,
  ListTodo,
  Landmark,
  PiggyBank,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type NavLeaf = { name: string; href: string; icon: LucideIcon; permission?: string; children?: never };
type NavSection = { name: string; children: NavLeaf[] };
type NavItem = NavLeaf | NavSection;

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    name: "VENTAS",
    children: [
      { name: "Nueva Venta", href: "/ventas/nueva", icon: ShoppingCart, permission: "ventas.create" },
      { name: "Cotizaciones", href: "/cotizaciones", icon: FileText, permission: "cotizaciones.view" },
      { name: "Clientes", href: "/clientes", icon: Users, permission: "clientes.view" },
      { name: "Deudores", href: "/deudores", icon: AlertCircle, permission: "deudores.view" },
      { name: "Tareas y Recordatorios", href: "/tareas", icon: ListTodo, permission: "tareas.view" },
    ],
  },
  {
    name: "INVENTARIO",
    children: [
      { name: "Productos", href: "/productos", icon: Package, permission: "productos.view" },
      { name: "Proveedores", href: "/proveedores", icon: Truck, permission: "proveedores.view" },
      { name: "Solicitudes de Pedido", href: "/pedidos-proveedores", icon: ClipboardList, permission: "compras.view" },
    ],
  },
  {
    name: "FINANZAS",
    children: [
      { name: "Caja/Dinero", href: "/dinero", icon: Wallet, permission: "finanzas.view" },
      { name: "Distribucion", href: "/distribucion", icon: PieChart, permission: "finanzas.view" },
      { name: "Gastos", href: "/gastos", icon: BarChart3, permission: "finanzas.gastos" },
      { name: "Prestamos", href: "/prestamos", icon: Landmark, permission: "finanzas.view" },
      { name: "Colchon Financiero", href: "/colchon", icon: PiggyBank, permission: "finanzas.colchon" },
      { name: "Consultor Balance", href: "/balance", icon: ClipboardList, permission: "reportes.ver" },
    ],
  },
  { name: "Configuracion", href: "/configuracion", icon: Settings },
];

const adminNavigation: NavSection[] = [
  {
    name: "ADMINISTRACION",
    children: [
      { name: "Usuarios", href: "/usuarios", icon: UserCog },
      { name: "Roles y Permisos", href: "/roles", icon: ShieldCheck },
      { name: "Historial", href: "/historial", icon: History },
    ],
  },
];

export function Sidebar({ isOpen, onClose }: Props) {
  const { user } = useAuth();
  const showAdmin = user?.is_superuser;
  const perms = user?.permissions ?? [];

  const canViewItem = (item: { permission?: string }) =>
    !item.permission || user?.is_superuser || perms.includes(item.permission);

  const visibleNavigation = navigation
    .map((item) => {
      if (!item.children) return canViewItem(item) ? item : null;
      const children = item.children.filter(canViewItem);
      return children.length > 0 ? { ...item, children } : null;
    })
    .filter(Boolean) as typeof navigation;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden animate-fade"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "glass-dark fixed left-0 top-0 z-50 flex h-full w-72 flex-col text-white transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full",
          "lg:translate-x-0 lg:static lg:z-auto"
        )}
      >
        <div className="relative flex items-center gap-3 border-b border-white/10 p-5">
          <div className="relative">
            <div className="absolute inset-0 rounded-xl bg-gold-400/50 blur-lg" />
            <img src="/logo.png" alt="Jormar Distribuciones" className="relative h-11 w-11 rounded-xl object-contain ring-2 ring-gold-400/60 drop-shadow-[0_0_8px_rgba(216,174,75,0.4)]" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-wide text-gold-400">JORMAR</h1>
            <p className="text-[11px] uppercase tracking-[0.25em] text-white/50">Distribuciones</p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-4 flex-1 space-y-1 overflow-y-auto px-4 pb-4">
          {[...visibleNavigation, ...(showAdmin ? adminNavigation : [])].map((item) =>
            item.children ? (
              <div key={item.name} className="mb-5">
                <p className="mb-2 flex items-center gap-2 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-500/90">
                  <span className="h-px flex-1 bg-gradient-to-r from-transparent via-gold-500/50 to-transparent" />
                  {item.name}
                  <span className="h-px flex-1 bg-gradient-to-r from-transparent via-gold-500/50 to-transparent" />
                </p>
                <div className="space-y-1">
                  {item.children.map((child) => (
                    <NavLink
                      key={child.href}
                      to={child.href}
                      onClick={onClose}
                      className={({ isActive }) =>
                        cn(
                          "nav-item flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm",
                          isActive
                            ? "is-active bg-gradient-to-r from-gold-500/25 to-transparent font-medium text-gold-300 shadow-[inset_0_0_0_1px_rgba(216,174,75,0.25)]"
                            : "text-white/65 hover:bg-white/8 hover:text-white"
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span className="nav-indicator" />
                          <child.icon className={cn("nav-icon h-4 w-4", isActive && "text-gold-400")} />
                          {child.name}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            ) : (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    "nav-item flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm",
                    isActive
                      ? "is-active bg-gradient-to-r from-gold-500/25 to-transparent font-medium text-gold-300 shadow-[inset_0_0_0_1px_rgba(216,174,75,0.25)]"
                      : "text-white/65 hover:bg-white/8 hover:text-white"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="nav-indicator" />
                    <item.icon className={cn("nav-icon h-4 w-4", isActive && "text-gold-400")} />
                    {item.name}
                  </>
                )}
              </NavLink>
            )
          )}
        </nav>

        <div className="border-t border-white/10 p-4">
          <a
            href="https://catalogo-vpfe.dian.gov.co/User/PersonLogin"
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="nav-item flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/65 transition hover:bg-white/8 hover:text-white"
          >
            <ExternalLink className="nav-icon h-4 w-4" />
            Ir a la DIAN
          </a>

          {/* Perfil del usuario */}
          <div className="mt-3 flex items-center gap-3 rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold-400 to-gold-600 text-xs font-bold text-neutral-950">
              {user?.full_name?.trim()?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || user?.username?.slice(0, 2).toUpperCase() || "JC"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white/90">
                {user?.full_name || user?.username || "Usuario"}
              </p>
              {user?.is_superuser && (
                <span className="text-[10px] font-medium uppercase tracking-wider text-gold-400">Administrador</span>
              )}
            </div>
            <span className="text-[10px] text-white/40">v1.0</span>
          </div>
        </div>
      </aside>
    </>
  );
}
