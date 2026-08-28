import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { balanceApi, type BalanceData } from "@/api/balance.api";
import { formatCurrency } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  AlertTriangle,
  BarChart3,
  ArrowDownCircle,
  ArrowUpCircle,
  Search,
  Wallet,
} from "lucide-react";

export function BalancePage() {
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["balance", fechaInicio, fechaFin],
    queryFn: () => balanceApi.get(fechaInicio, fechaFin),
  });

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Cargando balance...</div>;
  }

  const d = data as BalanceData;

  const methodLabels: Record<string, string> = {
    efectivo: "Efectivo",
    nequi: "Nequi",
    bancolombia: "Bancolombia",
    bogota: "Banco de Bogota",
    credito: "Credito",
  };

  const catLabels: Record<string, string> = {
    general: "General",
    arriendo: "Arriendo",
    servicios: "Servicios",
    nomina: "Nomina",
    transporte: "Transporte",
    material: "Material",
    impuestos: "Impuestos",
    marketing: "Marketing",
    mantenimiento: "Mantenimiento",
    otro: "Otro",
  };

  const methodColors: Record<string, string> = {
    efectivo: "bg-green-50 border-green-200 text-green-700",
    nequi: "bg-purple-50 border-purple-200 text-purple-700",
    bancolombia: "bg-yellow-50 border-yellow-200 text-yellow-700",
    bogota: "bg-red-50 border-red-200 text-red-700",
    credito: "bg-orange-50 border-orange-200 text-orange-700",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Consultor de Balance</h1>

      {/* Filtros de fecha */}
      <div className="flex flex-wrap items-end gap-4 rounded-xl border bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Fecha Inicio</label>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Fecha Fin</label>
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 rounded-lg bg-gold-600 px-4 py-2 text-sm text-white hover:bg-gold-700"
        >
          <Search className="h-4 w-4" />
          Consultar
        </button>
        <button
          onClick={() => { setFechaInicio(""); setFechaFin(""); }}
          className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          Limpiar
        </button>
        <span className="ml-auto text-xs text-gray-400">
          Periodo: {d.periodo.inicio} al {d.periodo.fin}
        </span>
      </div>

      {/* RESUMEN GENERAL */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Ventas"
          value={d.ventas.total}
          sub={`${d.ventas.cantidad} ventas | Ticket: ${formatCurrency(d.ventas.ticket_promedio)}`}
          icon={<TrendingUp className="h-5 w-5 text-green-600" />}
          color="green"
        />
        <SummaryCard
          title="Total Gastos"
          value={d.gastos.total}
          sub={`${d.gastos.cantidad} gastos registrados`}
          icon={<TrendingDown className="h-5 w-5 text-red-600" />}
          color="red"
        />
        <SummaryCard
          title="Ganancia Neta"
          value={d.ganancia.bruta}
          sub={`Margen: ${d.ganancia.margen.toFixed(1)}%`}
          icon={<DollarSign className="h-5 w-5 text-gold-600" />}
          color="blue"
        />
        <SummaryCard
          title="Abonos Recibidos"
          value={d.abonos.total}
          sub={`Deuda pendiente: ${formatCurrency(d.deuda.pendiente)}`}
          icon={<ArrowDownCircle className="h-5 w-5 text-purple-600" />}
          color="purple"
        />
      </div>

      {/* SEGUNDA FILA */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Productos"
          value={d.inventario.total_productos}
          isNumber
          sub={`${d.inventario.bajo_stock} con stock bajo`}
          icon={<Package className="h-5 w-5 text-orange-600" />}
          color="orange"
          noFormat
        />
        <SummaryCard
          title="Clientes"
          value={d.clientes.total}
          isNumber
          sub="Clientes activos"
          icon={<Users className="h-5 w-5 text-teal-600" />}
          color="teal"
          noFormat
        />
        <SummaryCard
          title="Inventario (Costo)"
          value={d.inventario.valor_compra}
          sub={`Venta: ${formatCurrency(d.inventario.valor_venta)}`}
          icon={<BarChart3 className="h-5 w-5 text-gold-600" />}
          color="indigo"
        />
        <SummaryCard
          title="Deuda Pendiente"
          value={d.deuda.pendiente}
          sub="Creditos por cobrar"
          icon={<AlertTriangle className="h-5 w-5 text-rose-600" />}
          color="rose"
        />
      </div>

      {/* GRAFICAS DE VENTAS */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-800">
            <TrendingUp className="h-4 w-4 text-green-600" />
            Ventas por Dia
          </h2>
          {d.ventas.por_dia.length === 0 ? (
            <p className="text-sm text-gray-400">No hay ventas en este periodo</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={d.ventas.por_dia} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradVentas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                <Area
                  type="monotone"
                  dataKey="total"
                  name="Ventas"
                  stroke="#16a34a"
                  fill="url(#gradVentas)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-800">
            <TrendingUp className="h-4 w-4 text-gold-600" />
            Distribucion por Metodo de Pago
          </h2>
          {(() => {
            const pieData = Object.entries(d.ventas.por_metodo).map(([k, v]) => ({
              name: methodLabels[k] || k,
              value: v,
            }));
            const pieColors = ["#16a34a", "#7c3aed", "#eab308", "#dc2626", "#ea580c"];
            return Object.values(d.ventas.por_metodo).every((v) => v === 0) ? (
              <p className="text-sm text-gray-400">No hay ventas en este periodo</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={pieColors[i % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            );
          })()}
        </div>
      </div>

      {/* TOP PRODUCTOS (grafica) */}
      {d.top_productos.length > 0 && (
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-800">
            <Package className="h-4 w-4 text-orange-600" />
            Top 5 Productos Mas Vendidos (Grafica)
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={d.top_productos.map((p) => ({ ...p, unidades: Number(p.unidades_vendidas) }))}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="producto" tick={{ fontSize: 11 }} interval={0} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="unidades" name="Unidades" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* SALDO DISPONIBLE POR METODO */}
      <div className="rounded-xl border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-full bg-green-100 p-2">
            <Wallet className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">Dinero Disponible por Metodo</h2>
            <p className="text-xs text-gray-500">Ventas + Abonos - Gastos - Saques (historial completo)</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {Object.entries(d.saldo_por_metodo).map(([key, val]) => (
            <div key={key} className={`rounded-lg border p-3 ${methodColors[key] || "bg-gray-50 border-gray-200"}`}>
              <p className="text-xs font-medium opacity-70">{methodLabels[key] || key}</p>
              <p className={`text-lg font-bold ${val >= 0 ? "" : "text-red-600"}`}>
                {formatCurrency(val)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* VENTAS POR METODO */}
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-800">
            <TrendingUp className="h-4 w-4 text-green-600" />
            Ventas por Metodo de Pago
          </h2>
          <div className="space-y-3">
            {Object.entries(d.ventas.por_metodo).map(([key, val]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{methodLabels[key] || key}</span>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-32 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-green-500"
                      style={{ width: `${d.ventas.total > 0 ? (val / d.ventas.total) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="w-28 text-right text-sm font-medium">{formatCurrency(val)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* GASTOS POR CATEGORIA */}
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-800">
            <TrendingDown className="h-4 w-4 text-red-600" />
            Gastos por Categoria
          </h2>
          {Object.keys(d.gastos.por_categoria).length === 0 ? (
            <p className="text-sm text-gray-400">No hay gastos en este periodo</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(d.gastos.por_categoria)
                .sort((a, b) => b[1] - a[1])
                .map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{catLabels[key] || key}</span>
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-32 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-red-500"
                          style={{ width: `${d.gastos.total > 0 ? (val / d.gastos.total) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="w-28 text-right text-sm font-medium">{formatCurrency(val)}</span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* ABONOS POR METODO */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-800">
          <ArrowDownCircle className="h-4 w-4 text-purple-600" />
          Abonos Recibidos por Metodo (Historial Completo)
        </h2>
        {Object.values(d.abonos.por_metodo).every((v) => v === 0) ? (
          <p className="text-sm text-gray-400">No se han recibido abonos</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(d.abonos.por_metodo).map(([key, val]) => (
              <div key={key} className={`rounded-lg border p-3 ${methodColors[key] || "bg-gray-50 border-gray-200"}`}>
                <p className="text-xs font-medium opacity-70">{methodLabels[key] || key}</p>
                <p className="text-lg font-bold">{formatCurrency(val)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TOP PRODUCTOS */}
      {d.top_productos.length > 0 && (
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-800">
            <Package className="h-4 w-4 text-orange-600" />
            Top 5 Productos Mas Vendidos
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Producto</th>
                  <th className="px-3 py-2 text-right">Unidades</th>
                  <th className="px-3 py-2 text-right">Total Generado</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {d.top_productos.map((p, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-bold text-gray-400">{i + 1}</td>
                    <td className="px-3 py-2 font-medium">{p.producto}</td>
                    <td className="px-3 py-2 text-right">{p.unidades_vendidas}</td>
                    <td className="px-3 py-2 text-right font-medium">{formatCurrency(p.total_generado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DEUDORES */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-800">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          Deudores - Creditos Pendientes
        </h2>
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-red-50 p-4">
            <p className="text-sm text-gray-600">Total deudores</p>
            <p className="text-2xl font-bold text-red-700">{d.deudores.cantidad}</p>
          </div>
          <div className="rounded-lg bg-red-50 p-4">
            <p className="text-sm text-gray-600">Total pendiente por cobrar</p>
            <p className="text-2xl font-bold text-red-700">{formatCurrency(d.deudores.total_pendiente)}</p>
          </div>
        </div>

        {d.deudores.lista.length === 0 ? (
          <p className="text-sm text-gray-400">No hay deudores pendientes</p>
        ) : (
          <div className="space-y-3">
            {d.deudores.lista.map((deudor) => (
              <details key={deudor.sale_id} className="group rounded-lg border border-red-200 bg-red-50/50">
                <summary className="flex cursor-pointer items-center justify-between p-4 hover:bg-red-100/50">
                  <div className="flex flex-col">
                    <span className="font-semibold text-gray-800">{deudor.client_name}</span>
                    <span className="text-xs text-gray-500">
                      {deudor.client_doc} | {deudor.client_phone} | Remision: {deudor.invoice_number}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-500">Vendio: {formatCurrency(deudor.total)}</span>
                    <span className="text-green-600">Pagado: {formatCurrency(deudor.total_paid)}</span>
                    <span className="font-bold text-red-600">Debe: {formatCurrency(deudor.balance)}</span>
                  </div>
                </summary>
                <div className="border-t border-red-200 px-4 pb-4 pt-3">
                  <div className="mb-3">
                    <p className="mb-1 text-xs font-semibold uppercase text-gray-500">Productos comprados</p>
                    <div className="flex flex-wrap gap-2">
                      {deudor.items.map((item, idx) => (
                        <span key={idx} className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">
                          {item.producto} x{item.cantidad} ({formatCurrency(item.precio * item.cantidad)})
                        </span>
                      ))}
                    </div>
                  </div>
                  {deudor.pagos.length > 0 && (
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase text-gray-500">Abonos realizados</p>
                      <div className="flex flex-wrap gap-2">
                        {deudor.pagos.map((pago, idx) => (
                          <span key={idx} className="rounded bg-green-100 px-2 py-1 text-xs text-green-700">
                            {pago.fecha}: {formatCurrency(pago.monto)} ({pago.metodo})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        )}
      </div>

      {/* RESUMEN FINAL */}
      <div className="rounded-xl border-2 border-gold-200 bg-gold-50 p-6">
        <h2 className="mb-3 text-lg font-bold text-gold-900">Resumen del Periodo</h2>
        <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
          <div>
            <span className="text-gold-600">Ingresos reales del periodo (contado + abonos):</span>
            <p className="text-lg font-bold text-green-700">{formatCurrency(d.ventas.total)}</p>
          </div>
          <div>
            <span className="text-gold-600">Egresos totales:</span>
            <p className="text-lg font-bold text-red-700">{formatCurrency(d.gastos.total)}</p>
          </div>
          <div>
            <span className="text-gold-600">Ganancia neta:</span>
            <p className={`text-lg font-bold ${d.ganancia.bruta >= 0 ? "text-green-700" : "text-red-700"}`}>
              {formatCurrency(d.ganancia.bruta)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, isNumber, sub, icon, color, noFormat }: {
  title: string;
  value: number;
  isNumber?: boolean;
  sub: string;
  icon: React.ReactNode;
  color: string;
  noFormat?: boolean;
}) {
  const colors: Record<string, string> = {
    green: "bg-green-50 border-green-200",
    red: "bg-red-50 border-red-200",
    blue: "bg-gold-50 border-gold-200",
    purple: "bg-purple-50 border-purple-200",
    orange: "bg-orange-50 border-orange-200",
    teal: "bg-teal-50 border-teal-200",
    indigo: "bg-gold-50 border-gold-200",
    rose: "bg-rose-50 border-rose-200",
  };
  const textColors: Record<string, string> = {
    green: "text-green-700",
    red: "text-red-700",
    blue: "text-gold-700",
    purple: "text-purple-700",
    orange: "text-orange-700",
    teal: "text-teal-700",
    indigo: "text-gold-700",
    rose: "text-rose-700",
  };

  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-600">{title}</span>
        {icon}
      </div>
      <p className={`text-xl font-bold ${textColors[color]}`}>
        {noFormat ? value : formatCurrency(value)}
      </p>
      <p className="mt-1 text-xs text-gray-500">{sub}</p>
    </div>
  );
}
