import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { catalogApi, type Category, type Unit } from "@/api/catalog.api";
import { monitorApi } from "@/api/monitor.api";
import { cn } from "@/lib/utils";
import {
  Plus,
  Trash2,
  Tag,
  Ruler,
  Activity,
  Server,
  Database,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Wifi,
} from "lucide-react";

export function ConfigPage() {
  const queryClient = useQueryClient();
  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");
  const [unitName, setUnitName] = useState("");
  const [unitAbbr, setUnitAbbr] = useState("");

  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: catalogApi.getCategories });
  const { data: units = [] } = useQuery({ queryKey: ["units"], queryFn: catalogApi.getUnits });

  const { data: monitor, isFetching, refetch } = useQuery({
    queryKey: ["monitor"],
    queryFn: monitorApi.getStatus,
    refetchInterval: 60_000,
  });

  const createCat = useMutation({
    mutationFn: () => catalogApi.createCategory({ name: catName, description: catDesc || undefined }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["categories"] }); setCatName(""); setCatDesc(""); },
  });

  const deleteCat = useMutation({
    mutationFn: catalogApi.deleteCategory,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });

  const createUnit = useMutation({
    mutationFn: () => catalogApi.createUnit({ name: unitName, abbreviation: unitAbbr }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["units"] }); setUnitName(""); setUnitAbbr(""); },
  });

  const deleteUnit = useMutation({
    mutationFn: catalogApi.deleteUnit,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["units"] }),
  });

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Configuracion</h1>

      {/* Monitor de estado */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Activity className="h-5 w-5" /> Estado del Sistema</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">
              {monitor?.checked_at
                ? `Ultima revision: ${new Date(monitor.checked_at).toLocaleTimeString("es-CO")}`
                : isFetching ? "Comprobando..." : "Sin datos"}
            </span>
            <button onClick={() => refetch()} disabled={isFetching} className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
              <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} /> Comprobar ahora
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <MonitorPill icon={Server} label="Servidor (API)" ok={monitor ? monitor.status === "up" : undefined} />
          <MonitorPill icon={Database} label="Base de datos" ok={monitor ? monitor.database === "up" : undefined} />
          <MonitorPill
            icon={Wifi}
            label="Latencia"
            ok={monitor ? monitor.latency_ms != null : undefined}
            detail={monitor?.latency_ms != null ? `${monitor.latency_ms} ms` : undefined}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-gray-500">Disponibilidad hoy</p>
            <p className="text-lg font-bold">{monitor?.uptime_today != null ? `${monitor.uptime_today}%` : "--"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Ultimos 7 dias</p>
            <p className="text-lg font-bold">{monitor?.uptime_7d != null ? `${monitor.uptime_7d}%` : "--"}</p>
          </div>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-xs text-gray-500">Ultimas comprobaciones ({monitor?.recent_checks.length ?? 0})</p>
          <div className="flex items-end gap-1">
            {[...(monitor?.recent_checks ?? [])].reverse().map((c) => (
              <div
                key={c.id}
                title={`${new Date(c.created_at).toLocaleString("es-CO")} - ${c.status === "up" ? "En linea" : "Caido"}${c.latency_ms != null ? ` (${c.latency_ms} ms)` : ""}`}
                className={cn("h-7 w-2.5 rounded-sm", c.status === "up" ? "bg-green-500" : "bg-red-500")}
              />
            ))}
            {(monitor?.recent_checks.length ?? 0) === 0 && (
              <span className="text-xs text-gray-400">Todavia no hay registros. Haz clic en "Comprobar ahora".</span>
            )}
          </div>
        </div>
      </div>

      {/* Categorias */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Tag className="h-5 w-5" /> Categorias de Productos</h2>
        <div className="mb-4 flex gap-3">
          <input type="text" placeholder="Nombre" value={catName} onChange={(e) => setCatName(e.target.value)} className="flex-1 rounded-lg border px-3 py-2 text-sm" />
          <input type="text" placeholder="Descripcion (opcional)" value={catDesc} onChange={(e) => setCatDesc(e.target.value)} className="flex-1 rounded-lg border px-3 py-2 text-sm" />
          <button onClick={() => catName && createCat.mutate()} disabled={!catName} className="flex items-center gap-1 rounded-lg bg-gold-600 px-4 py-2 text-sm text-white hover:bg-gold-700 disabled:opacity-50"><Plus className="h-4 w-4" /> Agregar</button>
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-600"><tr><th className="px-4 py-2 text-left">Nombre</th><th className="px-4 py-2 text-left">Descripcion</th><th className="px-4 py-2">Estado</th><th className="px-4 py-2"></th></tr></thead>
            <tbody className="divide-y">
              {categories.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{c.name}</td>
                  <td className="px-4 py-2 text-gray-500">{c.description || "-"}</td>
                  <td className="px-4 py-2 text-center"><span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Activa</span></td>
                  <td className="px-4 py-2 text-right"><button onClick={() => deleteCat.mutate(c.id)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button></td>
                </tr>
              ))}
              {categories.length === 0 && <tr><td colSpan={4} className="px-4 py-4 text-center text-gray-400">Sin categorias</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Unidades */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Ruler className="h-5 w-5" /> Unidades de Medida</h2>
        <div className="mb-4 flex gap-3">
          <input type="text" placeholder="Nombre (ej: Kilogramo)" value={unitName} onChange={(e) => setUnitName(e.target.value)} className="flex-1 rounded-lg border px-3 py-2 text-sm" />
          <input type="text" placeholder="Abreviatura (ej: kg)" value={unitAbbr} onChange={(e) => setUnitAbbr(e.target.value)} className="w-32 rounded-lg border px-3 py-2 text-sm" />
          <button onClick={() => unitName && unitAbbr && createUnit.mutate()} disabled={!unitName || !unitAbbr} className="flex items-center gap-1 rounded-lg bg-gold-600 px-4 py-2 text-sm text-white hover:bg-gold-700 disabled:opacity-50"><Plus className="h-4 w-4" /> Agregar</button>
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-600"><tr><th className="px-4 py-2 text-left">Nombre</th><th className="px-4 py-2 text-left">Abreviatura</th><th className="px-4 py-2">Estado</th><th className="px-4 py-2"></th></tr></thead>
            <tbody className="divide-y">
              {units.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{u.name}</td>
                  <td className="px-4 py-2 font-mono text-sm">{u.abbreviation}</td>
                  <td className="px-4 py-2 text-center"><span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Activa</span></td>
                  <td className="px-4 py-2 text-right"><button onClick={() => deleteUnit.mutate(u.id)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button></td>
                </tr>
              ))}
              {units.length === 0 && <tr><td colSpan={4} className="px-4 py-4 text-center text-gray-400">Sin unidades</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info empresa */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Informacion de la Empresa</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-500">Nombre:</span> <strong>JORMAR DISTRIBUCIONES</strong></div>
          <div><span className="text-gray-500">NIT:</span> <strong>931814237</strong></div>
          <div><span className="text-gray-500">Ubicacion:</span> Mariquita, Tolima, Colombia</div>
          <div><span className="text-gray-500">Actividad:</span> Comercializacion de EPP (Equipo de Proteccion Personal)</div>
        </div>
      </div>
    </div>
  );
}

function MonitorPill({
  icon: Icon,
  label,
  ok,
  detail,
}: {
  icon: typeof Server;
  label: string;
  ok?: boolean;
  detail?: string;
}) {
  const statusText =
    detail ??
    (ok === undefined ? "Comprobando..." : ok ? "En linea" : "Sin respuesta");

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-gray-50/50 px-4 py-3">
      {ok === true && <CheckCircle2 className="h-5 w-5 text-green-600" />}
      {ok === false && <XCircle className="h-5 w-5 text-red-500" />}
      {ok === undefined && <Icon className="h-5 w-5 text-gray-400" />}
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className={cn("text-xs font-semibold", ok === undefined ? "text-gray-400" : ok ? "text-green-600" : "text-red-500")}>
          {statusText}
        </p>
      </div>
    </div>
  );
}
