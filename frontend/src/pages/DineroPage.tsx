import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cajaApi, type CajaResumen } from "@/api/caja.api";
import { retirosApi, type Retiro } from "@/api/retiros.api";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, TrendingDown, DollarSign, CreditCard, ArrowDownCircle, ArrowUpCircle, Plus, X, Wallet, AlertTriangle } from "lucide-react";

export function DineroPage() {
  const queryClient = useQueryClient();
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
    return <div className="p-8 text-center text-gray-500">Cargando...</div>;
  }

  const d = cajaData as CajaResumen;
  const retiros = (retirosData || []) as Retiro[];

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

  const catLabels: Record<string, string> = {
    utilidad: "Utilidad",
    inversion: "Inversión",
    costos: "Costos / Gastos",
  };

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
      <div className="flex animate-fade-up items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Wallet className="h-6 w-6 text-gold-600" />
            Caja / Dinero
          </h1>
          <p className="mt-1 text-sm text-gray-600">Control de caja, dinero y saques</p>
        </div>
      </div>

      {/* SALDO TOTAL */}
      <div className="card-premium rounded-xl border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-6 animate-fade-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-full bg-green-100 p-2">
            <Wallet className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">Dinero Total Disponible</h2>
            <p className="text-xs text-gray-500">Lo que deberia haber en total (ventas - gastos - saques)</p>
          </div>
        </div>
        <p className={`text-4xl font-extrabold ${d.saldo_total >= 0 ? "text-green-700" : "text-red-700"}`}>
          {formatCurrency(d.saldo_total)}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {Object.entries(d.saldo_por_metodo).map(([key, val]) => (
            <div key={key} className={`rounded-lg border p-3 ${methodColors[key] || "bg-gray-50 border-gray-200"}`}>
              <p className="text-xs font-medium opacity-70">{methodLabels[key] || key}</p>
              <p className={`text-lg font-bold ${val >= 0 ? "" : "text-red-600"}`}>
                {formatCurrency(val)}
              </p>
            </div>
          ))}
        </div>

        {d.total_retiros > 0 && (
          <p className="mt-3 text-xs text-gray-500">
            Total saques realizados: <span className="font-semibold text-red-600">-{formatCurrency(d.total_retiros)}</span>
          </p>
        )}
      </div>

      {/* Tarjetas resumen hoy */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-fade-up-delay-1">
        <Card title="Ventas Hoy" value={d.ventas_hoy} icon={<TrendingUp className="h-5 w-5 text-green-600" />} color="bg-green-50 border-green-200" textColor="text-green-700" />
        <Card title="Gastos Hoy" value={d.gastos_hoy} icon={<TrendingDown className="h-5 w-5 text-red-600" />} color="bg-red-50 border-red-200" textColor="text-red-700" />
        <Card title="Ganancia Neta Hoy" value={d.ganancia_neta_hoy} icon={<DollarSign className="h-5 w-5 text-gold-600" />} color="bg-gold-50 border-gold-200" textColor="text-gold-700" />
        <Card title="Abonos Hoy" value={d.abonos_hoy} icon={<CreditCard className="h-5 w-5 text-purple-600" />} color="bg-purple-50 border-purple-200" textColor="text-purple-700" />
      </div>

      {/* Tarjetas resumen mes */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 animate-fade-up-delay-1">
        <Card title="Ventas Mes" value={d.ventas_mes} icon={<TrendingUp className="h-5 w-5 text-green-600" />} color="bg-green-50 border-green-200" textColor="text-green-700" />
        <Card title="Gastos Mes" value={d.gastos_mes} icon={<TrendingDown className="h-5 w-5 text-red-600" />} color="bg-red-50 border-red-200" textColor="text-red-700" />
        <Card title="Ganancia Neta Mes" value={d.ganancia_neta_mes} icon={<DollarSign className="h-5 w-5 text-gold-600" />} color="bg-gold-50 border-gold-200" textColor="text-gold-700" />
      </div>

      {/* Distribucion del dinero */}
      <div className="card-premium animate-scale-in p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Distribución del Dinero</h2>
            <p className="text-xs text-gray-500">
              Cada venta se reparte entre estas categorías. Los gastos y saques salen de la categoría que elijas al crearlos.
            </p>
          </div>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
          >
            {showConfig ? "Ocultar" : "Cómo se distribuye"}
          </button>
        </div>

        {showConfig && (
          <div className="mb-4 rounded-lg border border-gold-200 bg-gold-50 p-3 text-xs text-gray-700">
            Reparto por defecto por cada venta: <strong>20% Utilidad</strong> · <strong>10% Costos/Gastos</strong> · <strong>70% Inversión</strong>.
            Los gastos se descuentan de <strong>Costos/Gastos</strong> y los saques de <strong>Utilidad</strong> (puedes cambiarlo al crearlos).
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="text-sm font-medium text-green-800">Utilidad</p>
            <p className="mt-1 text-2xl font-bold text-green-700">{formatCurrency(d.distribucion.utilidad)}</p>
            <p className="mt-1 text-xs text-green-600">
              Total generado: {formatCurrency(d.distribucion_totales.utilidad)}
            </p>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-800">Inversión</p>
            <p className={`mt-1 text-2xl font-bold ${d.distribucion.inversion >= 0 ? "text-blue-700" : "text-red-600"}`}>
              {formatCurrency(d.distribucion.inversion)}
            </p>
            <p className="mt-1 text-xs text-blue-600">
              Total generado: {formatCurrency(d.distribucion_totales.inversion)}
            </p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-800">Costos / Gastos</p>
            <p className={`mt-1 text-2xl font-bold ${d.distribucion.costos >= 0 ? "text-amber-700" : "text-red-600"}`}>
              {formatCurrency(d.distribucion.costos)}
            </p>
            <p className="mt-1 text-xs text-amber-600">
              Total generado: {formatCurrency(d.distribucion_totales.costos)}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-lg border-2 border-gray-300 bg-gray-50 px-4 py-3">
          <span className="text-sm font-semibold text-gray-700">
            Total Distribución
          </span>
          <span className="text-xl font-extrabold text-gray-900">
            {formatCurrency(d.distribucion.utilidad + d.distribucion.inversion + d.distribucion.costos)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Metodos de pago */}
        <div className="card-premium p-5">
          <h2 className="mb-4 text-base font-semibold text-gray-800">Ventas Hoy por Metodo</h2>
          <div className="space-y-3">
            {Object.entries(d.por_metodo).map(([key, val]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{methodLabels[key] || key}</span>
                <span className="text-sm font-medium">{formatCurrency(val)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t pt-3">
            <span className="text-sm font-semibold text-gray-800">Deuda Pendiente</span>
            <span className="text-sm font-bold text-red-600">{formatCurrency(d.deuda_pendiente)}</span>
          </div>
        </div>

        {/* Saques / Retiros */}
        <div className="card-premium p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">Saques / Retiros</h2>
            <button
              onClick={() => { setShowForm(!showForm); setRetiroError(null); }}
              className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs text-white hover:bg-red-700"
            >
              {showForm ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
              {showForm ? "Cancelar" : "Nuevo Saque"}
            </button>
          </div>

          {showForm && (
            <div className="mb-4 space-y-3 rounded-lg border border-red-200 bg-red-50 p-4">
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
                    <option value="costos">Costos / Gastos</option>
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
                className="w-full rounded-lg bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {createMutation.isPending ? "Guardando..." : "Registrar Saque"}
              </button>
              {retiroError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-white p-3 text-sm text-red-700">
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
                <div key={r.id} className="flex items-center gap-3 rounded-lg border px-3 py-2">
                  <ArrowUpCircle className="h-4 w-4 shrink-0 text-red-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.description}</p>
                    <p className="text-xs text-gray-400">
                      {methodLabels[r.source_method] || r.source_method} | {r.retiro_date} | {catLabels[r.distribution_category] || r.distribution_category} | Por: {r.user_name}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-red-600">-{formatCurrency(r.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Card({ title, value, icon, color, textColor }: {
  title: string; value: number; icon: React.ReactNode; color: string; textColor: string;
}) {
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-600">{title}</span>
        {icon}
      </div>
      <p className={`text-xl font-bold ${textColor}`}>{formatCurrency(value)}</p>
    </div>
  );
}
