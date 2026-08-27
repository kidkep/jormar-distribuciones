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
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  {
    name: "VENTAS",
    children: [
      { name: "Nueva Venta", href: "/ventas/nueva", icon: ShoppingCart },
      { name: "Cotizaciones", href: "/cotizaciones", icon: FileText },
      { name: "Clientes", href: "/clientes", icon: Users },
      { name: "Deudores", href: "/deudores", icon: AlertCircle },
    ],
  },
  {
    name: "INVENTARIO",
    children: [
      { name: "Productos", href: "/productos", icon: Package },
      { name: "Proveedores", href: "/proveedores", icon: Truck },
    ],
  },
  {
    name: "FINANZAS",
    children: [
      { name: "Caja/Dinero", href: "/dinero", icon: Wallet },
      { name: "Distribucion", href: "/distribucion", icon: PieChart },
      { name: "Gastos", href: "/gastos", icon: BarChart3 },
      { name: "Consultor Balance", href: "/balance", icon: ClipboardList },
    ],
  },
  { name: "Configuracion", href: "/configuracion", icon: Settings },
];

export function Sidebar({ isOpen, onClose }: Props) {
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
          {navigation.map((item) =>
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
