import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tasksApi, type Task } from "@/api/tasks.api";
import { usersApi } from "@/api/users.api";
import type { User as AppUser } from "@/api/types";
import { clientsApi } from "@/api/clients.api";
import { Plus, Search, CheckCircle2, Trash2, Calendar, User, AlertCircle, ListTodo, X, Pencil, UserCog } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { SkeletonCard } from "@/components/common/Skeleton";
import { EmptyState } from "@/components/common/TableStates";

const TASK_TYPES = [
  { value: "general", label: "General" },
  { value: "deudor", label: "Recordatorio deudor" },
  { value: "cliente", label: "Seguimiento cliente" },
  { value: "inventario", label: "Inventario" },
  { value: "otro", label: "Otro" },
];

const PRIORITIES = [
  { value: "alta", label: "Alta" },
  { value: "media", label: "Media" },
  { value: "baja", label: "Baja" },
];

const STATUS = [
  { value: "pendiente", label: "Pendiente" },
  { value: "completada", label: "Completada" },
];

const EMPTY_FORM = {
  title: "",
  description: "",
  task_type: "general",
  client_id: "",
  user_id: "",
  due_date: "",
  priority: "media",
};

export function TasksPage() {
  const { user: currentUser } = useAuth();
  const isSuper = Boolean(currentUser?.is_superuser);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks", filter, search],
    queryFn: () => tasksApi.list(1, 200, filter, search),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => clientsApi.list(1, 1000),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users", "assignable"],
    queryFn: () => usersApi.list(1, 200),
    enabled: isSuper,
  });

  const createMutation = useMutation({
    mutationFn: tasksApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setShowForm(false);
      setEditingTask(null);
      setForm(EMPTY_FORM);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof tasksApi.update>[1] }) => tasksApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setShowForm(false);
      setEditingTask(null);
      setForm(EMPTY_FORM);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: tasksApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const openCreate = () => {
    setEditingTask(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description || "",
      task_type: task.task_type,
      client_id: task.client_id ? String(task.client_id) : "",
      user_id: task.user_id ? String(task.user_id) : "",
      due_date: task.due_date ? task.due_date.slice(0, 10) : "",
      priority: task.priority,
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: form.title,
      description: form.description || undefined,
      task_type: form.task_type,
      client_id: form.client_id ? Number(form.client_id) : undefined,
      user_id: form.user_id ? Number(form.user_id) : undefined,
      due_date: form.due_date || undefined,
      priority: form.priority,
    };
    if (editingTask) {
      updateMutation.mutate({ id: editingTask.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const pending = tasks.filter((t) => t.status !== "completada").length;

  return (
    <div className="space-y-6">
      <div className="flex animate-fade-up items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <ListTodo className="h-6 w-6 text-gold-600" />
            Tareas y Recordatorios
          </h1>
          {pending > 0 && <p className="mt-1 text-sm text-gray-600">{pending} tareas pendientes</p>}
        </div>
        <button onClick={openCreate} className="btn-gold">
          <Plus className="h-4 w-4" />
          Nueva Tarea
        </button>
      </div>

      <div className="animate-fade-up-delay-1 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar tarea..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-premium pl-10"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("")}
            className={cn("rounded-lg border px-3 py-2 text-sm", filter === "" ? "border-gold-600 bg-gold-50 text-gold-700" : "border-gray-300")}
          >
            Todas
          </button>
          {STATUS.map((s) => (
            <button
              key={s.value}
              onClick={() => setFilter(s.value)}
              className={cn("rounded-lg border px-3 py-2 text-sm", filter === s.value ? "border-gold-600 bg-gold-50 text-gold-700" : "border-gray-300")}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="animate-scale-in space-y-3">
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : tasks.length === 0 ? (
          <EmptyState icon={AlertCircle} title="No hay tareas" description="Crea tareas y recordatorios para no olvidar ningún pendiente" />
        ) : (
          tasks.map((t) => (
            <div key={t.id} className="card-premium p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => updateMutation.mutate({ id: t.id, data: { status: t.status === "completada" ? "pendiente" : "completada" } })}
                    className={cn(
                      "mt-0.5 rounded-full p-1",
                      t.status === "completada" ? "bg-green-100 text-green-600" : "text-gray-300 hover:text-gray-400"
                    )}
                  >
                    <CheckCircle2 className="h-5 w-5" />
                  </button>
                  <div>
                    <p className={cn("font-medium", t.status === "completada" && "text-gray-400 line-through")}>{t.title}</p>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5">{TASK_TYPES.find((x) => x.value === t.task_type)?.label || t.task_type}</span>
                      {t.priority === "alta" && <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-700">Alta</span>}
                      {t.priority === "baja" && <span className="rounded-full bg-gray-100 px-2 py-0.5">Baja</span>}
                      {t.assignee_name && (
                        <span className="flex items-center gap-1 rounded-full bg-gold-50 px-2 py-0.5 text-gold-700">
                          <UserCog className="h-3 w-3" />{t.assignee_name}
                        </span>
                      )}
                      {t.creator_name && (
                        <span className="flex items-center gap-1 text-gray-600"><User className="h-3 w-3" />Creada por {t.creator_name}</span>
                      )}
                      {t.client_name && (
                        <span className="flex items-center gap-1"><User className="h-3 w-3" />{t.client_name}</span>
                      )}
                      {t.due_date && (
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(t.due_date)}</span>
                      )}
                    </div>
                    {t.description && <p className="mt-2 text-sm text-gray-600">{t.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {isSuper && (
                    <button onClick={() => openEdit(t)} className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gold-50 hover:text-gold-700">
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                  <button onClick={() => deleteMutation.mutate(t.id)} className="rounded-lg p-1.5 text-red-600 transition hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="modal-content w-full max-w-md rounded-2xl p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{editingTask ? "Editar Tarea" : "Nueva Tarea"}</h2>
              <button onClick={() => { setShowForm(false); setEditingTask(null); }} className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Titulo</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-premium" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Tipo</label>
                  <select value={form.task_type} onChange={(e) => setForm({ ...form, task_type: e.target.value })} className="input-premium">
                    {TASK_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Prioridad</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="input-premium">
                    {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </div>
              {isSuper && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Asignar a</label>
                  <select value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} className="input-premium">
                    <option value="">A mi mismo</option>
                    {users
                      .filter((u: AppUser) => u.id !== currentUser?.id)
                      .map((u: AppUser) => (
                        <option key={u.id} value={u.id}>
                          {u.role ? `[${u.role.name}] ` : ""}{u.full_name || u.username}
                        </option>
                      ))}
                  </select>
                </div>
              )}
              {form.task_type === "deudor" && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Deudor (cliente)</label>
                  <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} className="input-premium">
                    <option value="">Seleccionar cliente</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Fecha limite</label>
                <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="input-premium" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Descripcion</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-premium" rows={2} />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => { setShowForm(false); setEditingTask(null); }} className="btn-outline">Cancelar</button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="btn-gold disabled:opacity-50">
                  {createMutation.isPending || updateMutation.isPending ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}