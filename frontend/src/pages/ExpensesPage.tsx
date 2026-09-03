import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { expensesApi, type Expense, type ExpenseCreate } from "@/api/expenses.api";
import { Plus, Search, Trash2, BarChart3, Tag, X } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

const EXPENSE_CATEGORIES = [
  { value: "general", label: "General" },
  { value: "arriendo", label: "Arriendo" },
  { value: "servicios", label: "Servicios Publicos" },
  { value: "nomina", label: "Nomina" },
  { value: "transporte", label: "Transporte" },
  { value: "material", label: "Material Oficina" },
  { value: "impuestos", label: "Impuestos" },
  { value: "marketing", label: "Marketing" },
  { value: "mantenimiento", label: "Mantenimiento" },
  { value: "otro", label: "Otro" },
];

export function ExpensesPage() {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<ExpenseCreate>({
    description: "",
    amount: 0,
    category: "general",
    payment_method: "efectivo",
    distribution_category: "costos",
  });
  const queryClient = useQueryClient();

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses", search],
    queryFn: () => expensesApi.list(1, 200, search),
  });

  const { data: totalData } = useQuery({
    queryKey: ["expenses-total"],
    queryFn: expensesApi.getTotal,
  });

  const createMutation = useMutation({
    mutationFn: expensesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expenses-total"] });
      setShowModal(false);
      setForm({ description: "", amount: 0, category: "general", payment_method: "efectivo", distribution_category: "costos" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: expensesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expenses-total"] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(form);
  };

  return (
    <div className="space-y-6">
      <div className="flex animate-fade-up items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <BarChart3 className="h-6 w-6 text-gold-600" />
            Gastos y Costos
          </h1>
          {totalData && (
            <p className="mt-1 text-sm text-gray-600">Total gastos: <strong>{formatCurrency(totalData.total)}</strong></p>
          )}
        </div>
        <button onClick={() => setShowModal(true)} className="btn-gold">
          <Plus className="h-4 w-4" />
          Nuevo Gasto
        </button>
      </div>

      <div className="animate-fade-up-delay-1 relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Buscar gasto..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-premium pl-10" />
      </div>

      <div className="card-premium animate-scale-in overflow-x-auto p-0">
        <table className="table-premium w-full text-left text-sm">
          <thead className="text-xs uppercase">
            <tr>
              <th className="px-5 py-3">Fecha</th>
              <th className="px-5 py-3">Descripcion</th>
              <th className="px-5 py-3">Categoria</th>
              <th className="px-5 py-3">Metodo Pago</th>
              <th className="px-5 py-3">Monto</th>
              <th className="px-5 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Cargando...</td></tr>
            ) : expenses.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500"><BarChart3 className="mx-auto mb-2 h-8 w-8 text-gray-300" />No hay gastos registrados</td></tr>
            ) : (
              expenses.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3.5">{formatDate(e.expense_date)}</td>
                  <td className="px-5 py-3.5 font-medium text-gray-800">{e.description}</td>
                  <td className="px-5 py-3.5">
                    <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      <Tag className="h-3 w-3" />
                      {EXPENSE_CATEGORIES.find((c) => c.value === e.category)?.label || e.category}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 capitalize">{e.payment_method}</td>
                  <td className="px-5 py-3.5 font-bold text-red-600">-{formatCurrency(Number(e.amount))}</td>
                  <td className="px-5 py-3.5">
                    <button onClick={() => deleteMutation.mutate(e.id)} className="rounded-lg p-1.5 text-red-600 transition hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="modal-content w-full max-w-md rounded-2xl p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Nuevo Gasto</h2>
              <button onClick={() => setShowModal(false)} className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Descripcion</label>
                <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-premium" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Monto</label>
                  <input type="text" inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} className="input-premium" required />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Categoria</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-premium">
                    {EXPENSE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Metodo Pago</label>
                  <select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} className="input-premium">
                    <option value="efectivo">Efectivo</option>
                    <option value="nequi">Nequi</option>
                    <option value="bancolombia">Bancolombia</option>
                    <option value="bogota">Banco de Bogota</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Sale de la categoria</label>
                  <select value={form.distribution_category || "costos"} onChange={(e) => setForm({ ...form, distribution_category: e.target.value })} className="input-premium">
                    <option value="costos">Costos / Gastos</option>
                    <option value="utilidad">Utilidad</option>
                    <option value="inversion">Inversión</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Referencia</label>
                  <input type="text" value={form.reference || ""} onChange={(e) => setForm({ ...form, reference: e.target.value })} className="input-premium" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Notas</label>
                <textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-premium" rows={2} />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline">Cancelar</button>
                <button type="submit" className="btn-gold">Registrar Gasto</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
