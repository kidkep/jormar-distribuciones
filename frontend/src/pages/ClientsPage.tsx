import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientsApi, type Client, type ClientCreate } from "@/api/clients.api";
import { Plus, Search, Edit, Trash2, X, Users } from "lucide-react";

export function ClientsPage() {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientCreate>({
    document_number: "",
    name: "",
    document_type: "CC",
  });
  const queryClient = useQueryClient();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients", search],
    queryFn: () => clientsApi.list(1, 1000, search),
  });

  const createMutation = useMutation({
    mutationFn: clientsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setShowModal(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ClientCreate> }) =>
      clientsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setShowModal(false);
      setEditing(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: clientsApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clients"] }),
  });

  const resetForm = () => {
    setForm({ document_number: "", name: "", document_type: "CC" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const openEdit = (client: Client) => {
    setEditing(client);
    setForm({
      document_type: client.document_type,
      document_number: client.document_number,
      name: client.name,
      email: client.email || undefined,
      phone: client.phone || undefined,
      address: client.address || undefined,
      city: client.city || undefined,
    });
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex animate-fade-up items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Users className="h-6 w-6 text-gold-600" />
            Clientes
          </h1>
          <p className="mt-1 text-sm text-gray-600">Gestiona tus clientes registrados</p>
        </div>
        <button
          onClick={() => { resetForm(); setEditing(null); setShowModal(true); }}
          className="btn-gold"
        >
          <Plus className="h-4 w-4" />
          Nuevo Cliente
        </button>
      </div>

      <div className="animate-fade-up-delay-1 relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, documento o telefono..."
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
              <th className="px-5 py-3">Telefono</th>
              <th className="px-5 py-3">Ciudad</th>
              <th className="px-5 py-3">Estado</th>
              <th className="px-5 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Cargando...</td></tr>
            ) : clients.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No se encontraron clientes</td></tr>
            ) : (
              clients.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3.5 font-mono text-xs font-semibold text-gold-700">{c.document_type} {c.document_number}</td>
                  <td className="px-5 py-3.5 font-medium text-gray-800">{c.name}</td>
                  <td className="px-5 py-3.5 text-gray-600">{c.phone || "-"}</td>
                  <td className="px-5 py-3.5 text-gray-600">{c.city || "-"}</td>
                  <td className="px-5 py-3.5">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${c.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {c.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(c)} className="rounded-lg p-1.5 text-gold-600 transition hover:bg-gold-50">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => deleteMutation.mutate(c.id)} className="rounded-lg p-1.5 text-red-600 transition hover:bg-red-50">
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
              <h2 className="text-lg font-semibold text-gray-900">{editing ? "Editar Cliente" : "Nuevo Cliente"}</h2>
              <button onClick={() => setShowModal(false)} className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Tipo Documento</label>
                  <select value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })} className="input-premium">
                    <option value="CC">Cedula de Ciudadania</option>
                    <option value="NIT">NIT</option>
                    <option value="CE">Cedula Extranjeria</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Numero Documento</label>
                  <input type="text" value={form.document_number} onChange={(e) => setForm({ ...form, document_number: e.target.value })} className="input-premium" required />
                </div>
                <div className="col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Nombre</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-premium" required />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Telefono</label>
                  <input type="text" value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-premium" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Correo</label>
                  <input type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-premium" />
                </div>
                <div className="col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Direccion</label>
                  <input type="text" value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input-premium" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Ciudad</label>
                  <input type="text" value={form.city || ""} onChange={(e) => setForm({ ...form, city: e.target.value })} className="input-premium" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline">Cancelar</button>
                <button type="submit" className="btn-gold">
                  {editing ? "Guardar Cambios" : "Crear Cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
