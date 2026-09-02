import { useQuery } from "@tanstack/react-query";
import { monitorApi } from "@/api/monitor.api";
import { cn } from "@/lib/utils";
import { THEMES, getTheme, applyTheme, type ThemeName } from "@/lib/theme";
import { useState } from "react";
import {
  Activity,
  Server,
  Database,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Wifi,
  Palette,
} from "lucide-react";

export function ConfigPage() {
  const { data: monitor, isFetching, refetch } = useQuery({
    queryKey: ["monitor"],
    queryFn: monitorApi.getStatus,
    refetchInterval: 60_000,
  });

  const [theme, setTheme] = useState<ThemeName>(getTheme());

  const selectTheme = (name: ThemeName) => {
    applyTheme(name);
    setTheme(name);
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Configuracion</h1>

      {/* Temas de color */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold"><Palette className="h-5 w-5" /> Tema de Color</h2>
        <p className="mb-4 text-sm text-gray-500">Elige el color de acento de la aplicacion. Se guarda en este dispositivo.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {THEMES.map((t) => (
            <button
              key={t.name}
              onClick={() => selectTheme(t.name)}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-3 text-sm transition-colors",
                theme === t.name
                  ? "border-gold-500 bg-gold-50 font-semibold text-gold-700"
                  : "border-gray-200 hover:bg-gray-50"
              )}
            >
              <span
                className="h-6 w-6 shrink-0 rounded-full ring-2 ring-white shadow"
                style={{ backgroundColor: t.swatch }}
              />
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

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