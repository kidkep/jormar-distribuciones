import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productsApi, type Product, type ProductCreate } from "@/api/products.api";
import { Plus, Search, Edit, Power, Eye, EyeOff, X, Package } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

type StatusFilter = "all" | "active" | "inactive";

export function ProductsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [showPurchase, setShowPurchase] = useState(false);
  const [form, setForm] = useState<ProductCreate>({
    sku: "",
    name: "",
    purchase_price: 0,
    sale_price: 0,
    current_stock: 0,
    min_stock: 0,
  });
  const queryClient = useQueryClient();

  const isAdmin = user?.is_superuser;
  const perms = user?.permissions ?? [];
  const canToggle = isAdmin || perms.includes("productos.toggle_status");
  const canViewPurchase = isAdmin || perms.includes("productos.ver_compra");
  const canEdit = isAdmin || perms.includes("productos.edit");
  const canCreate = isAdmin || perms.includes("productos.create");

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", search, status],
    queryFn: () => productsApi.list(1, 1000, search, status),
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

  const toggleMutation = useMutation({
    mutationFn: productsApi.toggleStatus,
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

  const handleToggle = (product: Product) => {
    const action = product.is_active ? "desactivar" : "reactivar";
    if (window.confirm(`¿Seguro que deseas ${action} el producto "${product.name}"?`)) {
      toggleMutation.mutate(product.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex animate-fade-up items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Package className="h-6 w-6 text-gold-600" />
            Productos
          </h1>
          <p className="mt-1 text-sm text-gray-600">Gestiona tu inventario de productos</p>
        </div>
        {canCreate && (
          <button
            onClick={() => { resetForm(); setEditing(null); setShowModal(true); }}
            className="btn-gold"
          >
            <Plus className="h-4 w-4" />
            Nuevo Producto
          </button>
        )}
      </div>

      <div className="animate-fade-up-delay-1 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-premium pl-10"
          />
        </div>
        <div className="flex rounded-xl border border-gray-200 bg-white p-1 text-sm shadow-sm">
          {(["all", "active", "inactive"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-lg px-4 py-1.5 transition ${status === s ? "bg-gradient-to-r from-gold-500 to-gold-600 text-white shadow-md shadow-gold-500/30" : "text-gray-600 hover:bg-gray-100"}`}
            >
              {s === "all" ? "Todos" : s === "active" ? "Activos" : "Inactivos"}
            </button>
          ))}
        </div>
      </div>

      <div className="card-premium animate-scale-in overflow-x-auto p-0">
        <table className="table-premium w-full text-left text-sm">
          <thead className="text-xs uppercase">
            <tr>
              <th className="px-5 py-3">SKU</th>
              <th className="px-5 py-3">Nombre</th>
              <th className="px-5 py-3">
                {canViewPurchase ? (
                  <button
                    onClick={() => setShowPurchase((v) => !v)}
                    title={showPurchase ? "Ocultar compra" : "Mostrar compra"}
                    className="inline-flex items-center gap-1 hover:text-gold-600"
                  >
                    {showPurchase ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    Precio Compra
                  </button>
                ) : (
                  <span>Precio Compra</span>
                )}
              </th>
              <th className="px-5 py-3">Precio Venta</th>
              <th className="px-5 py-3">Stock</th>
              <th className="px-5 py-3">Estado</th>
              <th className="px-5 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Cargando...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No se encontraron productos</td></tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className={`hover:bg-gray-50 ${p.is_active ? "" : "bg-gray-50/60 opacity-70"}`}>
                  <td className="px-5 py-3.5 font-mono text-xs font-semibold text-gold-700">{p.sku}</td>
                  <td className="px-5 py-3.5 font-medium text-gray-800">{p.name}</td>
                  <td className="px-5 py-3.5">
                    {showPurchase && canViewPurchase ? formatCurrency(p.purchase_price) : <span className="text-gray-300">•••</span>}
                  </td>
                  <td className="px-5 py-3.5 text-gray-800">{formatCurrency(p.sale_price)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${p.current_stock <= p.min_stock ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                      {p.current_stock}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${p.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {p.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2">
                      {canToggle && (
                        <button
                          onClick={() => handleToggle(p)}
                          title={p.is_active ? "Desactivar" : "Reactivar"}
                          className={`rounded-lg p-1.5 transition hover:bg-gray-100 ${p.is_active ? "text-red-600" : "text-green-600"}`}
                        >
                          <Power className="h-4 w-4" />
                        </button>
                      )}
                      {canEdit && (
                        <button onClick={() => openEdit(p)} className="rounded-lg p-1.5 text-gold-600 transition hover:bg-gold-50">
                          <Edit className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="modal-content w-full max-w-lg rounded-2xl p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{editing ? "Editar Producto" : "Nuevo Producto"}</h2>
              <button onClick={() => setShowModal(false)} className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">SKU</label>
                  <input
                    type="text"
                    value={editing ? editing.sku : (nextSku ?? "Calculando...")}
                    disabled
                    className="input-premium bg-gray-50 font-mono text-gray-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Nombre</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-premium" required />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Precio Compra</label>
                  <input type="text" inputMode="decimal" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: Number(e.target.value) })} className="input-premium" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Precio Venta</label>
                  <input type="text" inputMode="decimal" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: Number(e.target.value) })} className="input-premium" required />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Stock Actual</label>
                  <input type="text" inputMode="numeric" value={form.current_stock} onChange={(e) => setForm({ ...form, current_stock: Number(e.target.value) })} className="input-premium" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Stock Minimo</label>
                  <input type="text" inputMode="numeric" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: Number(e.target.value) })} className="input-premium" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline">Cancelar</button>
                <button type="submit" className="btn-gold">
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
