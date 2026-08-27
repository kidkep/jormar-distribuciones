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
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  {
    name: "VENTAS",
    children: [
      { name: "Nueva Venta", href: "/ventas/nueva", icon: ShoppingCart, permission: "ventas.create" },
      { name: "Cotizaciones", href: "/cotizaciones", icon: FileText, permission: "cotizaciones.view" },
      { name: "Clientes", href: "/clientes", icon: Users, permission: "clientes.view" },
      { name: "Deudores", href: "/deudores", icon: AlertCircle, permission: "deudores.view" },
    ],
  },
  {
    name: "INVENTARIO",
    children: [
      { name: "Productos", href: "/productos", icon: Package, permission: "productos.view" },
      { name: "Proveedores", href: "/proveedores", icon: Truck, permission: "proveedores.view" },
    ],
  },
  {
    name: "FINANZAS",
    children: [
      { name: "Caja/Dinero", href: "/dinero", icon: Wallet, permission: "finanzas.view" },
      { name: "Distribucion", href: "/distribucion", icon: PieChart, permission: "finanzas.view" },
      { name: "Gastos", href: "/gastos", icon: BarChart3, permission: "finanzas.gastos" },
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
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-64 bg-gray-900 text-white transition-transform duration-200 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0 lg:static lg:z-auto"
        )}
      >
        <div className="flex items-center gap-3 border-b border-gray-700 p-4">
          <img src="/logo.png" alt="Jormar Distribuciones" className="h-10 w-10 rounded-lg object-contain" />
          <div>
            <h1 className="text-sm font-bold">JORMAR</h1>
            <p className="text-xs text-gray-400">DISTRIBUCIONES</p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-4 space-y-1 px-3">
          {[...visibleNavigation, ...(showAdmin ? adminNavigation : [])].map((item) =>
            item.children ? (
              <div key={item.name} className="mb-4">
                <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {item.name}
                </p>
                {item.children.map((child) => (
                  <NavLink
                    key={child.href}
                    to={child.href}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                        isActive
                          ? "bg-blue-600 text-white"
                          : "text-gray-300 hover:bg-gray-800 hover:text-white"
                      )
                    }
                  >
                    <child.icon className="h-4 w-4" />
                    {child.name}
                  </NavLink>
                ))}
              </div>
            ) : (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </NavLink>
            )
          )}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-700 p-3">
          <a
            href="https://catalogo-vpfe.dian.gov.co/User/PersonLogin"
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
          >
            <ExternalLink className="h-4 w-4" />
            Ir a la DIAN
          </a>
        </div>
      </aside>
    </>
  );
}
