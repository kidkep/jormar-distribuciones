import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { rolesApi } from "@/api/roles.api";
import type { Permission, Role } from "@/api/types";
import { Plus, Edit, Trash2, KeyRound, ShieldCheck, X } from "lucide-react";

interface FormState {
  name: string;
  description: string;
  permission_ids: number[];
}

const emptyForm: FormState = { name: "", description: "", permission_ids: [] };

export function RolesPage() {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: rolesApi.list,
  });

  const { data: permissions = [] } = useQuery({
    queryKey: ["roles-permissions"],
    queryFn: rolesApi.allPermissions,
  });

  const modules = useMemo(() => {
    const map = new Map<string, Permission[]>();
    for (const p of permissions) {
      const list = map.get(p.module) || [];
      list.push(p);
      map.set(p.module, list);
    }
    return Array.from(map.entries());
  }, [permissions]);

  const createMutation = useMutation({
    mutationFn: rolesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setShowModal(false);
      setForm(emptyForm);
      setErrorMsg(null);
    },
    onError: (err: any) => setErrorMsg(err?.response?.data?.detail || "Error al crear el rol"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: FormState }) => rolesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setShowModal(false);
      setEditing(null);
      setForm(emptyForm);
      setErrorMsg(null);
    },
    onError: (err: any) => setErrorMsg(err?.response?.data?.detail || "Error al guardar el rol"),
  });

  const deleteMutation = useMutation({
    mutationFn: rolesApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["roles"] }),
  });

  const togglePermission = (id: number) => {
    setForm((f) => ({
      ...f,
      permission_ids: f.permission_ids.includes(id)
        ? f.permission_ids.filter((x) => x !== id)
        : [...f.permission_ids, id],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      setErrorMsg("El nombre del rol es obligatorio");
      return;
    }
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const openEdit = (role: Role) => {
    setEditing(role);
    setForm({
      name: role.name,
      description: role.description || "",
      permission_ids: role.permissions.map((p) => p.id),
    });
    setErrorMsg(null);
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex animate-fade-up items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <ShieldCheck className="h-6 w-6 text-gold-600" />
            Roles y Permisos
          </h1>
          <p className="mt-1 text-sm text-gray-600">Administra los roles y permisos del sistema</p>
        </div>
        <button
          onClick={() => { setEditing(null); setForm(emptyForm); setErrorMsg(null); setShowModal(true); }}
          className="btn-gold"
        >
          <Plus className="h-4 w-4" />
          Nuevo Rol
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <p className="text-sm text-gray-500">Cargando...</p>
        ) : roles.length === 0 ? (
          <p className="text-sm text-gray-500">No hay roles creados</p>
        ) : (
          roles.map((role) => (
            <div key={role.id} className="card-premium p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-semibold text-gray-900">
                  <KeyRound className="h-4 w-4 text-gold-600" />
                  {role.name}
                </h3>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(role)} className="rounded-lg p-1.5 text-gold-600 transition hover:bg-gold-50">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button onClick={() => deleteMutation.mutate(role.id)} className="rounded-lg p-1.5 text-red-600 transition hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {role.description && <p className="mb-2 text-xs text-gray-500">{role.description}</p>}
              <div className="flex flex-wrap gap-1">
                {role.permissions.length === 0 ? (
                  <span className="text-xs text-gray-400">Sin permisos</span>
                ) : (
                  role.permissions.map((p) => (
                    <span key={p.id} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      {p.name}
                    </span>
                  ))
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="modal-content max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{editing ? "Editar Rol" : "Nuevo Rol"}</h2>
              <button onClick={() => setShowModal(false)} className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">{errorMsg}</div>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Nombre</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-premium"
                  placeholder="Ej: Vendedor, Administrador, Bodeguero"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Descripción</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input-premium"
                />
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-gray-700">Permisos</p>
                {modules.map(([module, perms]) => (
                  <div key={module} className="mb-3 rounded-lg border p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{module}</p>
                    <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                      {perms.map((p) => (
                        <label key={p.id} className="flex items-start gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={form.permission_ids.includes(p.id)}
                            onChange={() => togglePermission(p.id)}
                            className="mt-0.5 h-4 w-4"
                          />
                          <span>
                            {p.name}
                            {p.description && <span className="block text-xs text-gray-400">{p.description}</span>}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                {modules.length === 0 && <p className="text-sm text-gray-400">No hay permisos disponibles</p>}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline">Cancelar</button>
                <button type="submit" className="btn-gold">
                  {editing ? "Guardar Cambios" : "Crear Rol"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
