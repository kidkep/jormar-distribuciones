import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productsApi, type Product, type ProductCreate } from "@/api/products.api";
import { Plus, Search, Edit, Trash2, Package } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export function ProductsPage() {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductCreate>({
    sku: "",
    name: "",
    purchase_price: 0,
    sale_price: 0,
    current_stock: 0,
    min_stock: 0,
  });
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", search],
    queryFn: () => productsApi.list(1, 1000, search),
  });

  const { data: nextSku } = useQuery({
    queryKey: ["products-next-sku"],
    queryFn: () => productsApi.nextSku(),
    enabled: showModal && !editing,
  });

  const createMutation = useMutation({
    mutationFn: productsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setShowModal(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ProductCreate> }) =>
      productsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setShowModal(false);
      setEditing(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: productsApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });

  const resetForm = () => {
    setForm({ sku: "", name: "", purchase_price: 0, sale_price: 0, current_stock: 0, min_stock: 0 });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setForm({
      sku: product.sku,
      name: product.name,
      purchase_price: product.purchase_price,
      sale_price: product.sale_price,
      current_stock: product.current_stock,
      min_stock: product.min_stock,
      description: product.description || undefined,
    });
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
        <button
          onClick={() => { resetForm(); setEditing(null); setShowModal(true); }}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nuevo Producto
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre o SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-600">
            <tr>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Precio Compra</th>
              <th className="px-4 py-3">Precio Venta</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Cargando...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No se encontraron productos</td></tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3">{formatCurrency(p.purchase_price)}</td>
                  <td className="px-4 py-3">{formatCurrency(p.sale_price)}</td>
                  <td className="px-4 py-3">
                    <span className={p.current_stock <= p.min_stock ? "font-bold text-red-600" : ""}>
                      {p.current_stock}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs ${p.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {p.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(p)} className="rounded p-1 text-blue-600 hover:bg-blue-50">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => deleteMutation.mutate(p.id)} className="rounded p-1 text-red-600 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-lg font-semibold">{editing ? "Editar Producto" : "Nuevo Producto"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">SKU</label>
                  <input
                    type="text"
                    value={editing ? editing.sku : (nextSku ?? "Calculando...")}
                    disabled
                    className="w-full rounded-lg border bg-gray-50 px-3 py-2 text-sm text-gray-500 font-mono"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Nombre</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" required />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Precio Compra</label>
                  <input type="text" inputMode="decimal" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: Number(e.target.value) })} className="w-full rounded-lg border px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Precio Venta</label>
                  <input type="text" inputMode="decimal" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: Number(e.target.value) })} className="w-full rounded-lg border px-3 py-2 text-sm" required />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Stock Actual</label>
                  <input type="text" inputMode="numeric" value={form.current_stock} onChange={(e) => setForm({ ...form, current_stock: Number(e.target.value) })} className="w-full rounded-lg border px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Stock Minimo</label>
                  <input type="text" inputMode="numeric" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: Number(e.target.value) })} className="w-full rounded-lg border px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border px-4 py-2 text-sm">Cancelar</button>
                <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
                  {editing ? "Guardar Cambios" : "Crear Producto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
