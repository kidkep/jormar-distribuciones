import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cajaApi, type CajaResumen } from "@/api/caja.api";
import { retirosApi, type Retiro } from "@/api/retiros.api";
import { colchonApi, type ColchonResumen } from "@/api/colchon.api";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { TrendingUp, TrendingDown, DollarSign, CreditCard, ArrowUpCircle, Plus, X, Wallet, AlertTriangle, Landmark, PiggyBank } from "lucide-react";

const methodLabels: Record<string, string> = {
  efectivo: "Efectivo",
  nequi: "Nequi",
  bancolombia: "Bancolombia",
  bogota: "Banco de Bogota",
  credito: "Credito",
};

const methodColors: Record<string, string> = {
  efectivo: "bg-green-50 border-green-200 text-green-700",
  nequi: "bg-purple-50 border-purple-200 text-purple-700",
  bancolombia: "bg-yellow-50 border-yellow-200 text-yellow-700",
  bogota: "bg-red-50 border-red-200 text-red-700",
  credito: "bg-orange-50 border-orange-200 text-orange-700",
};

const methodDot: Record<string, string> = {
  efectivo: "bg-green-500",
  nequi: "bg-purple-500",
  bancolombia: "bg-yellow-500",
  bogota: "bg-red-500",
  credito: "bg-orange-500",
};

const catLabels: Record<string, string> = {
  utilidad: "Utilidad",
  inversion: "Inversión",
  costos: "Gasto",
};

function Stat({ title, value, icon, iconBg, iconColor, valueColor }: {
  title: string; value: number; icon: React.ReactNode; iconBg: string; iconColor: string; valueColor: string;
}) {
  return (
    <div className="card-premium rounded-2xl p-5">
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{title}</span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconBg} ${iconColor}`}>
          {icon}
        </span>
      </div>
      <p className={`mt-3 text-2xl font-semibold tracking-tight ${value < 0 ? "text-red-600" : valueColor}`}>
        {formatCurrency(value)}
      </p>
    </div>
  );
}

function DistCard({ label, value, total, className, labelColor, valueColor, totalColor }: {
  label: string; value: number; total: number; className: string; labelColor: string; valueColor: string; totalColor: string;
}) {
  return (
    <div className={`rounded-xl border p-4 ${className}`}>
      <p className={`text-sm font-medium ${labelColor}`}>{label}</p>
      <p className={`mt-1 text-2xl font-semibold tracking-tight ${value < 0 ? "text-red-600" : valueColor}`}>
        {formatCurrency(value)}
      </p>
      <p className={`mt-1 text-xs ${totalColor}`}>Total generado: {formatCurrency(total)}</p>
    </div>
  );
}

export function DineroPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canColchon = user?.is_superuser || (user?.permissions || []).includes("finanzas.colchon");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    source_method: "nequi",
    description: "",
    retiro_date: new Date().toISOString().split("T")[0],
    reference: "",
    notes: "",
    distribution_category: "utilidad",
  });
  const [retiroError, setRetiroError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  const { data: cajaData, isLoading: loadingCaja } = useQuery({
    queryKey: ["caja"],
    queryFn: cajaApi.getResumen,
  });

  const { data: retirosData, isLoading: loadingRetiros } = useQuery({
    queryKey: ["retiros"],
    queryFn: retirosApi.getAll,
  });

  const { data: colchonData } = useQuery({
    queryKey: ["colchon-resumen"],
    queryFn: colchonApi.getResumen,
    enabled: canColchon,
  });

  const createMutation = useMutation({
    mutationFn: retirosApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["retiros"] });
      queryClient.invalidateQueries({ queryKey: ["caja"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expenses-total"] });
      setShowForm(false);
      setRetiroError(null);
      setForm({ amount: "", source_method: "nequi", description: "", retiro_date: new Date().toISOString().split("T")[0], reference: "", notes: "", distribution_category: "utilidad" });
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.detail || error?.message || "Error al registrar el saque";
      setRetiroError(msg);
    },
  });

  if (loadingCaja || loadingRetiros) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 rounded-lg bg-gray-200/60 animate-pulse" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card-premium animate-pulse rounded-2xl p-5">
              <div className="h-4 w-24 rounded bg-gray-200/60" />
              <div className="mt-3 h-8 w-32 rounded bg-gray-200/60" />
            </div>
          ))}
        </div>
        <div className="card-premium animate-pulse h-72 rounded-2xl p-5">
          <div className="h-5 w-48 rounded bg-gray-200/60" />
        </div>
      </div>
    );
  }

  const d = cajaData as CajaResumen;
  const retiros = (retirosData || []) as Retiro[];
  const colchon = colchonData as ColchonResumen | undefined;

  const handleSubmit = () => {
    if (!form.amount || !form.description) return;
    createMutation.mutate({
      amount: parseFloat(form.amount),
      source_method: form.source_method,
      description: form.description,
      retiro_date: form.retiro_date,
      reference: form.reference,
      notes: form.notes,
      distribution_category: form.distribution_category,
    });
  };

  return (
    <div className="space-y-6">
      <div className="animate-fade-up">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-gray-900">
          <Wallet className="h-6 w-6 text-gold-600" />
          Caja / Dinero
        </h1>
        <p className="mt-1 text-sm text-gray-500">Control de caja, dinero y saques</p>
      </div>

      {/* SALDO TOTAL */}
      <div className="card-premium animate-fade-up rounded-2xl border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-100">
              <Wallet className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Dinero total disponible</h2>
              <p className="text-xs text-gray-500">Lo que debería haber en total (ventas - gastos - saques)</p>
            </div>
          </div>
          <p className={`text-3xl font-semibold tracking-tight sm:text-4xl ${d.saldo_total >= 0 ? "text-green-700" : "text-red-700"}`}>
            {formatCurrency(d.saldo_total)}
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {Object.entries(d.saldo_por_metodo).map(([key, val]) => (
            <div key={key} className={`rounded-xl border p-3 ${methodColors[key] || "bg-white border-gray-200 text-gray-700"}`}>
              <p className="text-[11px] font-medium uppercase tracking-wide opacity-70">{methodLabels[key] || key}</p>
              <p className={`mt-1 text-base font-semibold ${val >= 0 ? "" : "text-red-600"}`}>
                {formatCurrency(val)}
              </p>
            </div>
          ))}
        </div>

        {d.total_retiros > 0 && (
          <p className="mt-4 text-xs text-gray-500">
            Total saques realizados: <span className="font-semibold text-red-600">-{formatCurrency(d.total_retiros)}</span>
          </p>
        )}

        {/* Prestamos desglose */}
        {(d.prestamos_desembolsados > 0 || d.prestamos_abonados > 0) && (
          <div className="mt-4 rounded-xl border border-purple-200 bg-purple-50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Landmark className="h-4 w-4 text-purple-600" />
              <p className="text-sm font-semibold text-purple-800">Prestamos</p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="flex flex-col">
                <span className="text-xs text-gray-600">Total prestado (resta)</span>
                <span className="text-base font-bold text-red-600">-{formatCurrency(d.prestamos_desembolsados)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-600">Total abonos recibidos (suma)</span>
                <span className="text-base font-bold text-green-600">+{formatCurrency(d.prestamos_abonados)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-600">Neto prestamos</span>
                <span className={`text-base font-bold ${(d.prestamos_abonados - d.prestamos_desembolsados) >= 0 ? "text-green-700" : "text-red-700"}`}>
                  {formatCurrency(d.prestamos_abonados - d.prestamos_desembolsados)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tarjetas resumen hoy */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 animate-fade-up-delay-1">
        <Stat title="Ventas hoy" value={d.ventas_hoy} icon={<TrendingUp className="h-4 w-4" />} iconBg="bg-green-100" iconColor="text-green-600" valueColor="text-green-700" />
        <Stat title="Utilidad bruta hoy" value={d.utilidad_bruta_hoy} icon={<DollarSign className="h-4 w-4" />} iconBg="bg-teal-100" iconColor="text-teal-600" valueColor="text-teal-700" />
        <Stat title="Gastos hoy" value={d.gastos_hoy} icon={<TrendingDown className="h-4 w-4" />} iconBg="bg-red-100" iconColor="text-red-600" valueColor="text-red-700" />
        <Stat title="Ganancia neta hoy" value={d.ganancia_neta_hoy} icon={<DollarSign className="h-4 w-4" />} iconBg="bg-gold-100" iconColor="text-gold-600" valueColor="text-gold-700" />
        <Stat title="Abonos hoy" value={d.abonos_hoy} icon={<CreditCard className="h-4 w-4" />} iconBg="bg-purple-100" iconColor="text-purple-600" valueColor="text-purple-700" />
      </div>

      {/* Tarjetas resumen mes */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-fade-up-delay-1">
        <Stat title="Ventas mes" value={d.ventas_mes} icon={<TrendingUp className="h-4 w-4" />} iconBg="bg-green-100" iconColor="text-green-600" valueColor="text-green-700" />
        <Stat title="Utilidad bruta mes" value={d.utilidad_bruta_mes} icon={<DollarSign className="h-4 w-4" />} iconBg="bg-teal-100" iconColor="text-teal-600" valueColor="text-teal-700" />

        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Gastos mes</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-600">
              <TrendingDown className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-red-700">{formatCurrency(d.gastos_mes)}</p>
          {d.gastos_mes_por_distribucion && (
            <div className="mt-3 space-y-1 border-t border-red-100 pt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-amber-700">De Gasto (reales)</span>
                <span className="font-semibold text-amber-700">{formatCurrency(d.gastos_mes_por_distribucion.costos || 0)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-green-700">De Utilidad</span>
                <span className="font-semibold text-green-700">{formatCurrency(d.gastos_mes_por_distribucion.utilidad || 0)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-blue-700">De Inversión</span>
                <span className="font-semibold text-blue-700">{formatCurrency(d.gastos_mes_por_distribucion.inversion || 0)}</span>
              </div>
            </div>
          )}
        </div>

        <Stat title="Ganancia neta mes" value={d.ganancia_neta_mes} icon={<DollarSign className="h-4 w-4" />} iconBg="bg-gold-100" iconColor="text-gold-600" valueColor="text-gold-700" />
      </div>

      {/* Distribucion del dinero */}
      <div className="card-premium animate-scale-in rounded-2xl p-5 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Distribución del dinero</h2>
            <p className="mt-1 text-xs text-gray-500">
              Cada venta se reparte entre estas categorías. Los gastos y saques salen de la categoría que elijas al crearlos.
            </p>
          </div>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 transition-colors hover:bg-gray-50"
          >
            {showConfig ? "Ocultar" : "Cómo se distribuye"}
          </button>
        </div>

        {showConfig && (
          <div className="mb-5 rounded-xl border border-gold-200 bg-gold-50 p-3 text-xs text-gray-700">
            Reparto por defecto por cada venta: <strong>20% Utilidad</strong> · <strong>10% Gasto</strong> ·{" "}
            <strong>70% Inversión</strong>. Los gastos se descuentan de <strong>Gasto</strong> y los saques de{" "}
            <strong>Utilidad</strong> (puedes cambiarlo al crearlos).
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <DistCard label="Utilidad" value={d.distribucion.utilidad} total={d.distribucion_totales.utilidad}
            className="border-green-200 bg-green-50" labelColor="text-green-800" valueColor="text-green-700" totalColor="text-green-600" />
          <DistCard label="Inversión" value={d.distribucion.inversion} total={d.distribucion_totales.inversion}
            className="border-blue-200 bg-blue-50" labelColor="text-blue-800" valueColor="text-blue-700" totalColor="text-blue-600" />
          <DistCard label="Gasto" value={d.distribucion.costos} total={d.distribucion_totales.costos}
            className="border-amber-200 bg-amber-50" labelColor="text-amber-800" valueColor="text-amber-700" totalColor="text-amber-600" />
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl border-2 border-gray-300 bg-gray-50 px-4 py-3">
          <span className="text-sm font-semibold text-gray-700">Total distribución</span>
          <span className="text-xl font-semibold tracking-tight text-gray-900">
            {formatCurrency(d.distribucion.utilidad + d.distribucion.inversion + d.distribucion.costos)}
          </span>
        </div>

        {/* Prestamos */}
        {(d.prestamos_desembolsados > 0 || d.prestamos_abonados > 0) && (
          <div className="mt-3 rounded-xl border border-purple-200 bg-purple-50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Landmark className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-semibold text-purple-800">Prestamos</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Desembolsados (salen)</span>
              <span className="font-medium text-red-600">-{formatCurrency(d.prestamos_desembolsados)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-gray-600">Abonos recibidos (entran)</span>
              <span className="font-medium text-green-600">+{formatCurrency(d.prestamos_abonados)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-purple-200 pt-2 text-xs">
              <span className="font-semibold text-purple-800">Neto prestamos</span>
              <span className={`font-bold ${(d.prestamos_abonados - d.prestamos_desembolsados) >= 0 ? "text-green-700" : "text-red-700"}`}>
                {formatCurrency(d.prestamos_abonados - d.prestamos_desembolsados)}
              </span>
            </div>
          </div>
        )}

        {/* Colchon financiero */}
        {colchon && (
          <div className="mt-3 flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">
            <div className="flex items-center gap-2">
              <PiggyBank className="h-4 w-4 text-blue-500" />
              <span className="text-xs font-medium text-blue-700">Colchón financiero</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold text-blue-800">{formatCurrency(colchon.monto_base)}</span>
              <span className="ml-2 text-[11px] text-blue-500">disp. {formatCurrency(colchon.saldo_disponible)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Metodos de pago */}
        <div className="card-premium rounded-2xl p-5 sm:p-6">
          <h2 className="text-base font-semibold text-gray-800">Ventas hoy por método</h2>
          <div className="mt-4 space-y-3">
            {Object.entries(d.por_metodo).map(([key, val]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-gray-600">
                  <span className={`h-2 w-2 rounded-full ${methodDot[key] || "bg-gray-400"}`} />
                  {methodLabels[key] || key}
                </span>
                <span className={`text-sm font-semibold ${val < 0 ? "text-red-600" : "text-gray-900"}`}>{formatCurrency(val)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t pt-3">
            <span className="text-sm font-semibold text-gray-800">Deuda pendiente</span>
            <span className="text-sm font-bold text-red-600">{formatCurrency(d.deuda_pendiente)}</span>
          </div>
        </div>

        {/* Saques / Retiros */}
        <div className="card-premium rounded-2xl p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">Saques / Retiros</h2>
            <button
              onClick={() => { setShowForm(!showForm); setRetiroError(null); }}
              className={showForm
                ? "flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50"
                : "flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700"}
            >
              {showForm ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
              {showForm ? "Cancelar" : "Nuevo saque"}
            </button>
          </div>

          {showForm && (
            <div className="mb-4 space-y-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Monto *</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="input-premium"
                    placeholder="0"
                  />
                  {d && (
                    <p className="mt-1 text-xs text-gray-500">
                      Disponible: <span className="font-semibold text-gray-700">{formatCurrency(d.saldo_por_metodo[form.source_method] || 0)}</span>
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Salida de *</label>
                  <select
                    value={form.source_method}
                    onChange={(e) => setForm({ ...form, source_method: e.target.value })}
                    className="input-premium"
                  >
                    <option value="nequi">Nequi</option>
                    <option value="bancolombia">Bancolombia</option>
                    <option value="bogota">Banco de Bogota</option>
                    <option value="efectivo">Efectivo</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Sale de la categoria *</label>
                  <select
                    value={form.distribution_category}
                    onChange={(e) => setForm({ ...form, distribution_category: e.target.value })}
                    className="input-premium"
                  >
                    <option value="utilidad">Utilidad</option>
                    <option value="inversion">Inversión</option>
                    <option value="costos">Gasto</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Para que fue? *</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input-premium"
                  placeholder="Ej: Pago proveedor, Recarga, etc."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Fecha</label>
                  <input
                    type="date"
                    value={form.retiro_date}
                    onChange={(e) => setForm({ ...form, retiro_date: e.target.value })}
                    className="input-premium"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Referencia</label>
                  <input
                    type="text"
                    value={form.reference}
                    onChange={(e) => setForm({ ...form, reference: e.target.value })}
                    className="input-premium"
                    placeholder="Opcional"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Notas</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="input-premium"
                  placeholder="Algo mas que quieras recordar"
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={createMutation.isPending || !form.amount || !form.description}
                className="w-full rounded-lg bg-red-600 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {createMutation.isPending ? "Guardando..." : "Registrar saque"}
              </button>
              {retiroError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-white p-3 text-sm text-red-700">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>{retiroError}</span>
                </div>
              )}
            </div>
          )}

          {retiros.length === 0 ? (
            <p className="text-sm text-gray-400">No hay saques registrados</p>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {retiros.map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2">
                  <ArrowUpCircle className="h-4 w-4 shrink-0 text-red-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800">{r.description}</p>
                    <p className="truncate text-xs text-gray-400">
                      {methodLabels[r.source_method] || r.source_method} | {r.retiro_date} | {catLabels[r.distribution_category] || r.distribution_category} | Por: {r.user_name}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-red-600">-{formatCurrency(r.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
