import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  distributionsApi,
  type DistributionSummary,
  type DistributionItem,
} from "@/api/distributions.api";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PiggyBank,
  Wallet,
  Filter,
  Calendar,
  RotateCcw,
} from "lucide-react";

export function DistribucionPage() {
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  const { data: summaryData, isLoading: loadingSummary } = useQuery({
    queryKey: ["distributions", "summary", fechaInicio, fechaFin],
    queryFn: () => distributionsApi.getSummary(fechaInicio || undefined, fechaFin || undefined),
  });

  const { data: historyData, isLoading: loadingHistory } = useQuery({
    queryKey: ["distributions", "history"],
    queryFn: () => distributionsApi.getAll(1, 100),
  });

  const summary = summaryData as DistributionSummary | undefined;
  const history = (historyData || []) as DistributionItem[];

  const methodLabels: Record<string, string> = {
    efectivo: "Efectivo",
    nequi: "Nequi",
    bancolombia: "Bancolombia",
    bogota: "Bogota",
    credito: "Credito",
  };

  const methodColors: Record<string, string> = {
    efectivo: "bg-green-100 text-green-700",
    nequi: "bg-purple-100 text-purple-700",
    bancolombia: "bg-yellow-100 text-yellow-700",
    bogota: "bg-red-100 text-red-700",
    credito: "bg-orange-100 text-orange-700",
  };

  const clearFilters = () => {
    setFechaInicio("");
    setFechaFin("");
  };

  if (loadingSummary || loadingHistory) {
    return <div className="p-8 text-center text-gray-500">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Distribucion del Dinero
        </h1>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="rounded bg-blue-100 px-2 py-1 text-blue-700">
            Utilidad: {summary?.pct_utilidad ?? 20}%
          </span>
          <span className="rounded bg-red-100 px-2 py-1 text-red-700">
            Gastos: {summary?.pct_gastos ?? 10}%
          </span>
          <span className="rounded bg-green-100 px-2 py-1 text-green-700">
            Inversion: {summary?.pct_inversion ?? 70}%
          </span>
        </div>
      </div>

      {/* Filtros de fecha */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-600">Filtrar por fechas:</span>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Desde</label>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="rounded-lg border px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Hasta</label>
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="rounded-lg border px-3 py-1.5 text-sm"
          />
        </div>
        {(fechaInicio || fechaFin) && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
          >
            <RotateCcw className="h-3 w-3" />
            Limpiar
          </button>
        )}
      </div>

      {/* Tarjetas de acumulados */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Total Ventas</p>
              <p className="text-xs text-gray-400">
                {summary?.count_ventas ?? 0} venta{(summary?.count_ventas ?? 0) !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <p className="text-2xl font-extrabold text-blue-700">
            {formatCurrency(summary?.total_ventas ?? 0)}
          </p>
        </div>

        <div className="rounded-xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-3">
            <div className="rounded-full bg-emerald-100 p-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">
                Utilidad Acumulada
              </p>
              <p className="text-xs text-gray-400">
                {summary?.pct_utilidad ?? 20}% de cada venta
              </p>
            </div>
          </div>
          <p className="text-2xl font-extrabold text-emerald-700">
            {formatCurrency(summary?.total_utilidad ?? 0)}
          </p>
        </div>

        <div className="rounded-xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-rose-50 p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-3">
            <div className="rounded-full bg-red-100 p-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">
                Gastos Acumulados
              </p>
              <p className="text-xs text-gray-400">
                {summary?.pct_gastos ?? 10}% de cada venta
              </p>
            </div>
          </div>
          <p className="text-2xl font-extrabold text-red-700">
            {formatCurrency(summary?.total_gastos ?? 0)}
          </p>
        </div>

        <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-3">
            <div className="rounded-full bg-amber-100 p-2">
              <PiggyBank className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">
                Inversion Acumulada
              </p>
              <p className="text-xs text-gray-400">
                {summary?.pct_inversion ?? 70}% de cada venta
              </p>
            </div>
          </div>
          <p className="text-2xl font-extrabold text-amber-700">
            {formatCurrency(summary?.total_inversion ?? 0)}
          </p>
        </div>
      </div>

      {/* Barras de porcentajes */}
      {summary && summary.total_ventas > 0 && (
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-800">
            Distribucion Porcentual
          </h2>
          <div className="space-y-3">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium text-emerald-600">
                  Utilidad ({summary.pct_utilidad}%)
                </span>
                <span className="text-xs font-bold text-emerald-600">
                  {formatCurrency(summary.total_utilidad)}
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${summary.pct_utilidad}%` }}
                />
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium text-red-600">
                  Gastos ({summary.pct_gastos}%)
                </span>
                <span className="text-xs font-bold text-red-600">
                  {formatCurrency(summary.total_gastos)}
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-red-500 transition-all"
                  style={{ width: `${summary.pct_gastos}%` }}
                />
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium text-amber-600">
                  Inversion ({summary.pct_inversion}%)
                </span>
                <span className="text-xs font-bold text-amber-600">
                  {formatCurrency(summary.total_inversion)}
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all"
                  style={{ width: `${summary.pct_inversion}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Historial de distribuciones */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-800">
          Historial de Distribuciones
        </h2>
        {history.length === 0 ? (
          <p className="text-sm text-gray-400">
            No hay distribuciones registradas
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs text-gray-500">
                  <th className="pb-2 pr-4 font-medium">Remision</th>
                  <th className="pb-2 pr-4 font-medium">Fecha</th>
                  <th className="pb-2 pr-4 font-medium">Cliente</th>
                  <th className="pb-2 pr-4 font-medium">Metodo</th>
                  <th className="pb-2 pr-4 text-right font-medium">Venta</th>
                  <th className="pb-2 pr-4 text-right font-medium text-emerald-600">
                    Utilidad
                  </th>
                  <th className="pb-2 pr-4 text-right font-medium text-red-600">
                    Gastos
                  </th>
                  <th className="pb-2 text-right font-medium text-amber-600">
                    Inversion
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b last:border-0 hover:bg-gray-50"
                  >
                    <td className="py-2.5 pr-4 font-medium text-gray-800">
                      {d.invoice_number}
                    </td>
                    <td className="py-2.5 pr-4 text-gray-600">
                      {formatDate(d.sale_date)}
                    </td>
                    <td className="py-2.5 pr-4 text-gray-600">
                      {d.client_name || "Sin cliente"}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          methodColors[d.payment_method] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {methodLabels[d.payment_method] || d.payment_method}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-right font-medium text-gray-800">
                      {formatCurrency(d.sale_total)}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-medium text-emerald-600">
                      {formatCurrency(d.monto_utilidad)}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-medium text-red-600">
                      {formatCurrency(d.monto_gastos)}
                    </td>
                    <td className="py-2.5 text-right font-medium text-amber-600">
                      {formatCurrency(d.monto_inversion)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
