import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { stockApi, type StockMovement } from "@/api/stock.api";
import { productsApi, type Product } from "@/api/products.api";
import { Plus, Search, ArrowDownToLine, ArrowUpFromLine, AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/utils";

export function StockPage() {
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [productId, setProductId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [adjustmentType, setAdjustmentType] = useState("entrada");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: movements = [], isLoading } = useQuery({
    queryKey: ["stock-movements"],
    queryFn: () => stockApi.list(1, 200),
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => productsApi.list(1, 1000),
  });

  const adjustMutation = useMutation({
    mutationFn: stockApi.adjust,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setShowForm(false);
      setProductId(null);
      setQuantity(1);
      setAdjustmentType("entrada");
      setReason("");
      setError(null);
    },
    onError: (error: any) => {
      setError(error?.response?.data?.detail || error?.message || "Error al ajustar el inventario");
    },
  });

  const filtered = movements.filter(
    (m) =>
      !search ||
      (m.product_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) return;
    adjustMutation.mutate({
      product_id: productId,
      quantity,
      adjustment_type: adjustmentType,
      reason: reason || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Ajustes de Inventario</h1>
        <button
          onClick={() => { setError(null); setShowForm(true); }}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Ajustar Stock
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar movimiento por producto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-600">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3 text-right">Cantidad</th>
              <th className="px-4 py-3 text-right">Antes</th>
              <th className="px-4 py-3 text-right">Despues</th>
              <th className="px-4 py-3">Razon</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Cargando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No hay movimientos registrados</td></tr>
            ) : (
              filtered.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{formatDate(m.movement_date)}</td>
                  <td className="px-4 py-3">{m.product_name || `Producto #${m.product_id}`}</td>
                  <td className="px-4 py-3">
                    <span className={`flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                      m.movement_type === "entrada" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>
                      {m.movement_type === "entrada" ? <ArrowDownToLine className="h-3 w-3" /> : <ArrowUpFromLine className="h-3 w-3" />}
                      {m.movement_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{m.quantity}</td>
                  <td className="px-4 py-3 text-right">{m.stock_before}</td>
                  <td className="px-4 py-3 text-right font-medium">{m.stock_after}</td>
                  <td className="px-4 py-3 text-gray-500">{m.reason || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-lg font-semibold">Ajustar Inventario</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Producto</label>
                <select value={productId ?? ""} onChange={(e) => setProductId(e.target.value ? Number(e.target.value) : null)} className="w-full rounded-lg border px-3 py-2 text-sm" required>
                  <option value="">Seleccionar producto</option>
                  {products.filter((p) => p.is_active).map((p) => (
                    <option key={p.id} value={p.id}>{p.sku} - {p.name} (Stock: {p.current_stock})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Tipo</label>
                  <select value={adjustmentType} onChange={(e) => setAdjustmentType(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm">
                    <option value="entrada">Entrada (+)</option>
                    <option value="salida">Salida (-)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Cantidad</label>
                  <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="w-full rounded-lg border px-3 py-2 text-sm" required />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Razon</label>
                <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="Ej: conteo fisico, merma..." />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border px-4 py-2 text-sm">Cancelar</button>
                <button type="submit" disabled={!productId || adjustMutation.isPending} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
                  {adjustMutation.isPending ? "Ajustando..." : "Aplicar Ajuste"}
                </button>
              </div>
              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
