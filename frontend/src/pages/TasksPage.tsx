import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tasksApi, type Task } from "@/api/tasks.api";
import { clientsApi, type Client } from "@/api/clients.api";
import { Plus, Search, CheckCircle2, Trash2, Calendar, User, AlertCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

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

export function TasksPage() {
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    task_type: "general",
    client_id: "",
    due_date: "",
    priority: "media",
  });
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks", filter, search],
    queryFn: () => tasksApi.list(1, 200, filter, search),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => clientsApi.list(1, 1000),
  });

  const createMutation = useMutation({
    mutationFn: tasksApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setShowForm(false);
      setForm({ title: "", description: "", task_type: "general", client_id: "", due_date: "", priority: "media" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof tasksApi.update>[1] }) => tasksApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: tasksApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      title: form.title,
      description: form.description || undefined,
      task_type: form.task_type,
      client_id: form.client_id ? Number(form.client_id) : undefined,
      due_date: form.due_date || undefined,
      priority: form.priority,
    });
  };

  const pending = tasks.filter((t) => t.status !== "completada").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tareas y Recordatorios</h1>
          {pending > 0 && <p className="text-sm text-gray-500">{pending} tareas pendientes</p>}
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-lg bg-gold-600 px-4 py-2 text-sm text-white hover:bg-gold-700">
          <Plus className="h-4 w-4" />
          Nueva Tarea
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar tarea..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-gold-500 focus:outline-none"
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

      <div className="space-y-3">
        {isLoading ? (
          <div className="rounded-xl border bg-white p-8 text-center text-gray-500">Cargando...</div>
        ) : tasks.length === 0 ? (
          <div className="rounded-xl border bg-white p-8 text-center text-gray-500">
            <AlertCircle className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            No hay tareas
          </div>
        ) : (
          tasks.map((t) => (
            <div key={t.id} className="rounded-xl border bg-white p-4 shadow-sm">
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
                <button onClick={() => deleteMutation.mutate(t.id)} className="rounded p-1 text-red-600 hover:bg-red-50">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-lg font-semibold">Nueva Tarea</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Titulo</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Tipo</label>
                  <select value={form.task_type} onChange={(e) => setForm({ ...form, task_type: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm">
                    {TASK_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Prioridad</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm">
                    {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </div>
              {form.task_type === "deudor" && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Deudor (cliente)</label>
                  <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm">
                    <option value="">Seleccionar cliente</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Fecha limite</label>
                <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Descripcion</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" rows={2} />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border px-4 py-2 text-sm">Cancelar</button>
                <button type="submit" disabled={createMutation.isPending} className="rounded-lg bg-gold-600 px-4 py-2 text-sm text-white hover:bg-gold-700 disabled:opacity-50">
                  {createMutation.isPending ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
