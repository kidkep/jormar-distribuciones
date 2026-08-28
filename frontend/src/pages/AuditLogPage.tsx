import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { auditApi, type AuditLogEntry } from "@/api/audit.api";
import { History, Search, RefreshCw } from "lucide-react";

const ENTITY_LABELS: Record<string, string> = {
  user: "Usuario",
  role: "Rol",
  product: "Producto",
  client: "Cliente",
  supplier: "Proveedor",
  expense: "Gasto",
  sale: "Venta",
  quote: "CotizaciÃ³n",
};

const ACTION_LABELS: Record<string, string> = {
  create: "Crear",
  update: "Editar",
  delete: "Eliminar",
  cancel: "Anular",
};

const ACTION_COLORS: Record<string, string> = {
  create: "bg-green-100 text-green-700",
  update: "bg-gold-100 text-gold-700",
  delete: "bg-red-100 text-red-700",
  cancel: "bg-orange-100 text-orange-700",
};

function parseValues(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function prettyValues(raw: string | null): string {
  const data = parseValues(raw);
  if (!data) return "-";
  return Object.entries(data)
    .map(([k, v]) => `${k}: ${v === null || v === "" ? "-" : String(v)}`)
    .join(", ");
}

export function AuditLogPage() {
  const [search, setSearch] = useState("");
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");

  const { data: logs = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["audit", entityType, action, search],
    queryFn: () =>
      auditApi.list({
        page: 1,
        size: 200,
        entity_type: entityType || undefined,
        action: action || undefined,
        username: search || undefined,
      }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <History className="h-6 w-6 text-gold-600" />
          Historial de Actividades
        </h1>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
        >
          <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Filtrar por usuario..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-gold-500 focus:outline-none"
          />
        </div>
        <select
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
        >
          <option value="">Todas las entidades</option>
          {Object.entries(ENTITY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
        >
          <option value="">Todas las acciones</option>
          {Object.entries(ACTION_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-600">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">AcciÃ³n</th>
              <th className="px-4 py-3">Entidad</th>
              <th className="px-4 py-3">Detalle del cambio</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Cargando...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No hay actividades registradas</td></tr>
            ) : (
              logs.map((log: AuditLogEntry) => {
                const oldVals = parseValues(log.old_values);
                const newVals = parseValues(log.new_values);
                const detail =
                  log.action === "create" && newVals
                    ? prettyValues(log.new_values)
                    : log.action === "delete" && oldVals
                    ? prettyValues(log.old_values)
                    : log.action === "update" && (oldVals || newVals)
                    ? `De: ${prettyValues(log.old_values)} â†’ A: ${prettyValues(log.new_values)}`
                    : "-";
                return (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
                      {new Date(log.created_at).toLocaleString("es-CO")}
                    </td>
                    <td className="px-4 py-3">{log.full_name || log.username || "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs ${ACTION_COLORS[log.action] || "bg-gray-100 text-gray-700"}`}>
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-700">
                        {ENTITY_LABELS[log.entity_type] || log.entity_type}
                        {log.entity_id ? ` #${log.entity_id}` : ""}
                      </span>
                    </td>
                    <td className="max-w-md px-4 py-3 text-xs text-gray-600">{detail}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
