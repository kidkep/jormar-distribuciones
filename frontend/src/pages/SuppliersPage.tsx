import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { suppliersApi, type Supplier, type SupplierCreate } from "@/api/suppliers.api";
import { Plus, Search, Edit, Trash2, Truck, X } from "lucide-react";

export function SuppliersPage() {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState<SupplierCreate>({
    document_number: "",
    name: "",
    document_type: "NIT",
  });
  const queryClient = useQueryClient();

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["suppliers", search],
    queryFn: () => suppliersApi.list(1, 200, search),
  });

  const createMutation = useMutation({
    mutationFn: suppliersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setShowModal(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<SupplierCreate> }) =>
      suppliersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setShowModal(false);
      setEditing(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: suppliersApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
  });

  const resetForm = () => {
    setForm({ document_number: "", name: "", document_type: "NIT" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const openEdit = (supplier: Supplier) => {
    setEditing(supplier);
    setForm({
      document_type: supplier.document_type,
      document_number: supplier.document_number,
      name: supplier.name,
      contact_name: supplier.contact_name || undefined,
      email: supplier.email || undefined,
      phone: supplier.phone || undefined,
      address: supplier.address || undefined,
      city: supplier.city || undefined,
    });
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex animate-fade-up items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Truck className="h-6 w-6 text-gold-600" />
            Proveedores
          </h1>
          <p className="mt-1 text-sm text-gray-600">Gestiona tus proveedores</p>
        </div>
        <button
          onClick={() => { resetForm(); setEditing(null); setShowModal(true); }}
          className="btn-gold"
        >
          <Plus className="h-4 w-4" />
          Nuevo Proveedor
        </button>
      </div>

      <div className="animate-fade-up-delay-1 relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre o documento..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-premium pl-10"
        />
      </div>

      <div className="card-premium animate-scale-in overflow-x-auto p-0">
        <table className="table-premium w-full text-left text-sm">
          <thead className="text-xs uppercase">
            <tr>
              <th className="px-5 py-3">Documento</th>
              <th className="px-5 py-3">Nombre</th>
              <th className="px-5 py-3">Contacto</th>
              <th className="px-5 py-3">Telefono</th>
              <th className="px-5 py-3">Ciudad</th>
              <th className="px-5 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Cargando...</td></tr>
            ) : suppliers.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No se encontraron proveedores</td></tr>
            ) : (
              suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3.5 font-mono text-xs">{s.document_type} {s.document_number}</td>
                  <td className="px-5 py-3.5 font-medium text-gray-800">{s.name}</td>
                  <td className="px-5 py-3.5">{s.contact_name || "-"}</td>
                  <td className="px-5 py-3.5">{s.phone || "-"}</td>
                  <td className="px-5 py-3.5">{s.city || "-"}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(s)} className="rounded-lg p-1.5 text-gold-600 transition hover:bg-gold-50">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => deleteMutation.mutate(s.id)} className="rounded-lg p-1.5 text-red-600 transition hover:bg-red-50">
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
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="modal-content w-full max-w-lg rounded-2xl p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{editing ? "Editar Proveedor" : "Nuevo Proveedor"}</h2>
              <button onClick={() => setShowModal(false)} className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Tipo Documento</label>
                  <select value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })} className="input-premium">
                    <option value="NIT">NIT</option>
                    <option value="CC">Cedula de Ciudadania</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Numero Documento</label>
                  <input type="text" value={form.document_number} onChange={(e) => setForm({ ...form, document_number: e.target.value })} className="input-premium" required />
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Nombre</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-premium" required />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Contacto</label>
                  <input type="text" value={form.contact_name || ""} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} className="input-premium" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Telefono</label>
                  <input type="text" value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-premium" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Correo</label>
                  <input type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-premium" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Ciudad</label>
                  <input type="text" value={form.city || ""} onChange={(e) => setForm({ ...form, city: e.target.value })} className="input-premium" />
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Direccion</label>
                  <input type="text" value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input-premium" />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline">Cancelar</button>
                <button type="submit" className="btn-gold">
                  {editing ? "Guardar Cambios" : "Crear Proveedor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
