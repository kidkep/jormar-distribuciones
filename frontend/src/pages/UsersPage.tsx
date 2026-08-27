import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "@/api/users.api";
import { rolesApi } from "@/api/roles.api";
import type { User, UserCreate, UserUpdate } from "@/api/types";
import { Plus, Search, Edit, Trash2, ShieldCheck } from "lucide-react";

interface FormState {
  email: string;
  username: string;
  full_name: string;
  password: string;
  role_id: number | null;
  is_active: boolean;
  is_superuser: boolean;
}

const emptyForm: FormState = {
  email: "",
  username: "",
  full_name: "",
  password: "",
  role_id: null,
  is_active: true,
  is_superuser: false,
};

export function UsersPage() {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users", search],
    queryFn: () => usersApi.list(1, 200, search),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: rolesApi.list,
  });

  const createMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setShowModal(false);
      setForm(emptyForm);
      setErrorMsg(null);
    },
    onError: (err: any) => {
      setErrorMsg(err?.response?.data?.detail || "Error al crear el usuario");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UserUpdate }) =>
      usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setShowModal(false);
      setEditing(null);
      setForm(emptyForm);
      setErrorMsg(null);
    },
    onError: (err: any) => {
      setErrorMsg(err?.response?.data?.detail || "Error al guardar el usuario");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: usersApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      const { password, ...rest } = form;
      updateMutation.mutate({
        id: editing.id,
        data: password ? { ...rest, password } : rest,
      });
    } else {
      if (!form.password) {
        setErrorMsg("Debe indicar una contraseña para el nuevo usuario");
        return;
      }
      createMutation.mutate(form);
    }
  };

  const openEdit = (user: User) => {
    setEditing(user);
    setForm({
      email: user.email,
      username: user.username,
      full_name: user.full_name,
      password: "",
      role_id: user.role_id,
      is_active: user.is_active,
      is_superuser: user.is_superuser,
    });
    setErrorMsg(null);
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
        <button
          onClick={() => { setEditing(null); setForm(emptyForm); setErrorMsg(null); setShowModal(true); }}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nuevo Usuario
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre de usuario, correo o nombre completo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-600">
            <tr>
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Correo</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Cargando...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No se encontraron usuarios</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    <span className="flex items-center gap-2">
                      {u.is_superuser && <ShieldCheck className="h-4 w-4 text-green-600" />}
                      {u.username}
                    </span>
                  </td>
                  <td className="px-4 py-3">{u.full_name}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">
                    {u.is_superuser ? (
                      <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">Admin</span>
                    ) : (
                      u.role?.name || <span className="text-gray-400">Sin rol</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs ${u.is_active ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"}`}>
                      {u.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(u)} className="rounded p-1 text-blue-600 hover:bg-blue-50">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => deleteMutation.mutate(u.id)} className="rounded p-1 text-red-600 hover:bg-red-50">
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
            <h2 className="mb-4 text-lg font-semibold">{editing ? "Editar Usuario" : "Nuevo Usuario"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">{errorMsg}</div>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Usuario</label>
                <input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" required />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Nombre completo</label>
                  <input type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" required />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Correo</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" required />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {editing ? "Nueva contraseña (opcional)" : "Contraseña"}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={editing ? "Dejar en blanco para no cambiar" : ""}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  required={!editing}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Rol</label>
                <select value={form.role_id ?? ""} onChange={(e) => setForm({ ...form, role_id: e.target.value ? Number(e.target.value) : null })} className="w-full rounded-lg border px-3 py-2 text-sm">
                  <option value="">Sin rol</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4" />
                  Activo
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.is_superuser} onChange={(e) => setForm({ ...form, is_superuser: e.target.checked })} className="h-4 w-4" />
                  Administrador (acceso total)
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border px-4 py-2 text-sm">Cancelar</button>
                <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
                  {editing ? "Guardar Cambios" : "Crear Usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
