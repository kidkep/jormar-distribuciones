import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { colchonApi, type ColchonPrestamo, type ColchonResumen } from "@/api/colchon.api";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/utils";
import { PiggyBank, Plus, X, DollarSign, Clock, CheckCircle, ArrowDownCircle, AlertTriangle, Search, Trash2, Wallet, ShieldAlert, Pencil, Save } from "lucide-react";

export function ColchonPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isSuper = user?.is_superuser;
  const [showForm, setShowForm] = useState(false);
  const [showPagoForm, setShowPagoForm] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editMonto, setEditMonto] = useState(false);
  const [newMonto, setNewMonto] = useState("");

  const [form, setForm] = useState({
    person_name: "",
    amount: "",
    payment_method: "efectivo",
    description: "",
    notes: "",
  });

  const [pagoForm, setPagoForm] = useState({
    amount: "",
    payment_method: "efectivo",
    payment_date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const { data: resumen, isLoading: loadingResumen } = useQuery({
    queryKey: ["colchon-resumen"],
    queryFn: colchonApi.getResumen,
  });

  const { data: prestamos, isLoading: loadingPrestamos } = useQuery({
    queryKey: ["colchon", search, filterStatus],
    queryFn: () => colchonApi.list(search, filterStatus),
  });

  const montoMutation = useMutation({
    mutationFn: (monto: number) => colchonApi.updateMontoBase(monto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["colchon-resumen"] });
      queryClient.invalidateQueries({ queryKey: ["caja"] });
      setEditMonto(false);
      setError(null);
    },
    onError: (err: any) => {
      setError(err?.response?.data?.detail || "Error al actualizar el monto base");
    },
  });

  const createMutation = useMutation({
    mutationFn: colchonApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["colchon"] });
      queryClient.invalidateQueries({ queryKey: ["colchon-resumen"] });
      setShowForm(false);
      setError(null);
      setForm({ person_name: "", amount: "", payment_method: "efectivo", description: "", notes: "" });
    },
    onError: (err: any) => {
      setError(err?.response?.data?.detail || err?.message || "Error al crear prestamo");
    },
  });

  const pagoMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => colchonApi.registrarPago(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["colchon"] });
      queryClient.invalidateQueries({ queryKey: ["colchon-resumen"] });
      queryClient.invalidateQueries({ queryKey: ["caja"] });
      setShowPagoForm(null);
      setPagoForm({ amount: "", payment_method: "efectivo", payment_date: new Date().toISOString().split("T")[0], notes: "" });
    },
    onError: (err: any) => {
      setError(err?.response?.data?.detail || err?.message || "Error al registrar abono");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: colchonApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["colchon"] });
      queryClient.invalidateQueries({ queryKey: ["colchon-resumen"] });
    },
  });

  if (loadingResumen || loadingPrestamos) {
    return <div className="p-8 text-center text-gray-500">Cargando colchon financiero...</div>;
  }

  const r = resumen as ColchonResumen;
  const lista = (prestamos || []) as ColchonPrestamo[];

  const methodLabels: Record<string, string> = {
    efectivo: "Efectivo",
    nequi: "Nequi",
    bancolombia: "Bancolombia",
    bogota: "Banco de Bogota",
  };

  const methodColors: Record<string, string> = {
    efectivo: "bg-green-50 border-green-200 text-green-700",
    nequi: "bg-purple-50 border-purple-200 text-purple-700",
    bancolombia: "bg-yellow-50 border-yellow-200 text-yellow-700",
    bogota: "bg-red-50 border-red-200 text-red-700",
  };

  const statusLabels: Record<string, string> = {
    activo: "Activo",
    pagado: "Pagado",
    cancelado: "Cancelado",
  };

  const statusColors: Record<string, string> = {
    activo: "bg-yellow-100 text-yellow-700",
    pagado: "bg-green-100 text-green-700",
    cancelado: "bg-gray-100 text-gray-500",
  };

  const handleCreate = () => {
    if (!form.person_name || !form.amount || !form.description) return;
    createMutation.mutate({
      person_name: form.person_name,
      amount: parseFloat(form.amount),
      payment_method: form.payment_method,
      description: form.description,
      notes: form.notes || undefined,
    });
  };

  const handlePago = (prestamoId: number) => {
    if (!pagoForm.amount) return;
    pagoMutation.mutate({
      id: prestamoId,
      data: {
        amount: parseFloat(pagoForm.amount),
        payment_method: pagoForm.payment_method,
        payment_date: pagoForm.payment_date,
        notes: pagoForm.notes || undefined,
      },
    });
  };

  const handleGuardarMonto = () => {
    const val = parseFloat(newMonto);
    if (!val || val <= 0) {
      setError("Ingresa un monto valido mayor a 0");
      return;
    }
    montoMutation.mutate(val);
  };

  const pctFondo = r.monto_base > 0 ? (r.total_prestado / r.monto_base) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex animate-fade-up items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <PiggyBank className="h-6 w-6 text-gold-600" />
            Colchon Financiero
          </h1>
          <p className="mt-1 text-sm text-gray-600">Fondo interno de inversion para prestamos y rotacion</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setError(null); }}
          className="flex items-center gap-2 rounded-xl bg-gold-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg hover:bg-gold-700 transition-all"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Cancelar" : "Nuevo Prestamo"}
        </button>
      </div>

      {/* Tarjeta de Inversion / Colchon */}
      <div className="card-premium animate-fade-up rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-full bg-blue-100 p-2">
            <Wallet className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-800">Tarjeta de Inversion (Colchon Financiero)</h2>
            <p className="text-xs text-gray-500">Fondo de $1,000,000 que pertenece a la categoria inversion. Los abonos descuentan de inversion.</p>
          </div>
          {isSuper && (
            <button
              onClick={() => { setEditMonto(!editMonto); setNewMonto(String(r?.monto_base || "")); setError(null); }}
              className="flex items-center gap-1.5 rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-all"
            >
              <Pencil className="h-3 w-3" />
              {editMonto ? "Cancelar" : "Editar Valor (Super)"}
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
          <div className="rounded-lg border bg-white/60 p-3">
            <p className="text-xs font-medium text-gray-500">Valor del Colchon</p>
            <p className="text-xl font-extrabold text-blue-700">{formatCurrency(r?.monto_base || 0)}</p>
          </div>
          <div className="rounded-lg border bg-white/60 p-3">
            <p className="text-xs font-medium text-gray-500">Disponible para prestar</p>
            <p className={`text-xl font-extrabold ${(r?.saldo_disponible || 0) >= 0 ? "text-emerald-700" : "text-red-600"}`}>
              {formatCurrency(r?.saldo_disponible || 0)}
            </p>
          </div>
          <div className="rounded-lg border bg-white/60 p-3">
            <p className="text-xs font-medium text-gray-500">Total Prestado</p>
            <p className="text-xl font-extrabold text-amber-700">{formatCurrency(r?.total_prestado || 0)}</p>
          </div>
          <div className="rounded-lg border bg-white/60 p-3">
            <p className="text-xs font-medium text-gray-500">Pendiente por Cobrar</p>
            <p className="text-xl font-extrabold text-yellow-700">{formatCurrency(r?.total_pendiente || 0)}</p>
          </div>
        </div>

        {editMonto && (
          <div className="mt-2 rounded-lg border border-blue-200 bg-white p-4">
            <p className="mb-2 text-sm font-semibold text-blue-800">Actualizar valor del colchon (solo super usuario)</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="text"
                inputMode="decimal"
                value={newMonto}
                onChange={(e) => setNewMonto(e.target.value)}
                className="input-premium sm:w-64"
                placeholder="1000000"
              />
              <button
                onClick={handleGuardarMonto}
                disabled={montoMutation.isPending}
                className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-all"
              >
                <Save className="h-4 w-4" />
                {montoMutation.isPending ? "Guardando..." : "Guardar Valor"}
              </button>
            </div>
            {!isSuper && (
              <p className="mt-2 text-xs text-gray-500">Solo el administrador puede cambiar el valor del colchon.</p>
            )}
          </div>
        )}

        {/* Barra de uso del fondo */}
        <div className="mt-2">
          <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
            <span>Fondo utilizado</span>
            <span>{Math.round(pctFondo)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-blue-500 transition-all"
              style={{ width: `${Math.min(pctFondo, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 animate-fade-up-delay-1">
        <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-full bg-blue-100 p-2"><DollarSign className="h-5 w-5 text-blue-600" /></div>
            <span className="text-sm font-medium text-gray-600">Total Prestado</span>
          </div>
          <p className="text-2xl font-extrabold text-blue-700">{formatCurrency(r?.total_prestado || 0)}</p>
          <p className="mt-1 text-xs text-gray-500">{r?.prestamos_activos || 0} activos</p>
        </div>
        <div className="rounded-xl border-2 border-yellow-200 bg-gradient-to-r from-yellow-50 to-amber-50 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-full bg-yellow-100 p-2"><Clock className="h-5 w-5 text-yellow-600" /></div>
            <span className="text-sm font-medium text-gray-600">Pendiente por Cobrar</span>
          </div>
          <p className="text-2xl font-extrabold text-yellow-700">{formatCurrency(r?.total_pendiente || 0)}</p>
        </div>
        <div className="rounded-xl border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-full bg-green-100 p-2"><CheckCircle className="h-5 w-5 text-green-600" /></div>
            <span className="text-sm font-medium text-gray-600">Total Recuperado</span>
          </div>
          <p className="text-2xl font-extrabold text-green-700">{formatCurrency(r?.total_pagado || 0)}</p>
          <p className="mt-1 text-xs text-gray-500">{r?.prestamos_pagados || 0} pagados</p>
        </div>
      </div>

      {/* Formulario nuevo prestamo */}
      {showForm && (
        <div className="card-premium animate-scale-in rounded-xl border-2 border-gold-200 bg-gold-50/50 p-6">
          <h3 className="mb-4 text-base font-semibold text-gray-800">Nuevo Prestamo del Colchon</h3>
          <p className="mb-4 text-xs text-gray-500">
            Los prestamos se descuentan del colchon (disponible para prestar). Los abonos se pagan con la categoria Inversion.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Persona *</label>
              <input
                type="text"
                value={form.person_name}
                onChange={(e) => setForm({ ...form, person_name: e.target.value })}
                className="input-premium"
                placeholder="Ej: Juan Vendedor"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Monto *</label>
              <input
                type="text"
                inputMode="decimal"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="input-premium"
                placeholder="0"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Metodo de entrega *</label>
              <select
                value={form.payment_method}
                onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                className="input-premium"
              >
                <option value="efectivo">Efectivo</option>
                <option value="nequi">Nequi</option>
                <option value="bancolombia">Bancolombia</option>
                <option value="bogota">Banco de Bogota</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-600">Motivo / Descripcion *</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="input-premium"
                placeholder="Ej: Pago de servicios, compra de mercancia..."
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-600">Notas</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="input-premium"
                placeholder="Algo mas"
              />
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={createMutation.isPending || !form.person_name || !form.amount || !form.description}
            className="mt-4 w-full rounded-xl bg-gold-600 py-2.5 text-sm font-medium text-white hover:bg-gold-700 disabled:opacity-50 transition-all"
          >
            {createMutation.isPending ? "Creando..." : "Crear Prestamo"}
          </button>
          {error && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-white p-3 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por persona..."
            className="input-premium pl-10"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="input-premium w-auto"
        >
          <option value="">Todos</option>
          <option value="activo">Activos</option>
          <option value="pagado">Pagados</option>
          <option value="cancelado">Cancelados</option>
        </select>
      </div>

      {/* Lista de prestamos */}
      {lista.length === 0 ? (
        <div className="card-premium p-8 text-center text-gray-400">
          <PiggyBank className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p>No hay prestamos del colchon registrados</p>
        </div>
      ) : (
        <div className="space-y-4">
          {lista.map((p) => {
            const pagado = p.amount - p.remaining;
            const pct = p.amount > 0 ? (pagado / p.amount) * 100 : 0;
            return (
              <div key={p.id} className="card-premium animate-fade-up rounded-xl border p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base font-bold text-gray-900 truncate">{p.person_name}</h3>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[p.status] || "bg-gray-100"}`}>
                        {statusLabels[p.status] || p.status}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                        Inversion
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{p.description}</p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                      <span>Creado: {p.created_at}</span>
                      <span>Metodo: {methodLabels[p.payment_method] || p.payment_method}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-extrabold text-gray-900">{formatCurrency(p.amount)}</p>
                    <p className={`text-sm font-semibold ${p.remaining > 0 ? "text-yellow-600" : "text-green-600"}`}>
                      Pendiente: {formatCurrency(p.remaining)}
                    </p>
                    <p className="text-xs text-green-600">Pagado: {formatCurrency(pagado)}</p>
                  </div>
                </div>

                {/* Barra de progreso */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Progreso de pago</span>
                    <span>{Math.round(pct)}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-green-500" : "bg-gold-500"}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Pagos recientes */}
                {p.pagos && p.pagos.length > 0 && (
                  <div className="mt-3 rounded-lg bg-gray-50 p-3">
                    <p className="mb-2 text-xs font-medium text-gray-600">Abonos ({p.pagos.length}) - se descuentan de inversion</p>
                    <div className="max-h-32 space-y-1 overflow-y-auto">
                      {p.pagos.map((pg) => (
                        <div key={pg.id} className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">
                            <ArrowDownCircle className="mr-1 inline h-3 w-3 text-green-500" />
                            {pg.payment_date} - {methodLabels[pg.payment_method] || pg.payment_method}
                          </span>
                          <span className="font-medium text-green-600">+{formatCurrency(pg.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Botones de accion */}
                <div className="mt-3 flex items-center gap-2">
                  {p.status === "activo" && (
                    <button
                      onClick={() => {
                        setShowPagoForm(showPagoForm === p.id ? null : p.id);
                        setPagoForm({ amount: "", payment_method: "efectivo", payment_date: new Date().toISOString().split("T")[0], notes: "" });
                        setError(null);
                      }}
                      className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-all"
                    >
                      <DollarSign className="h-3 w-3" />
                      {showPagoForm === p.id ? "Cancelar" : "Registrar Abono (Inversion)"}
                    </button>
                  )}
                  {p.status === "activo" && (!p.pagos || p.pagos.length === 0) && (
                    <button
                      onClick={() => {
                        if (confirm("Eliminar este prestamo?")) {
                          deleteMutation.mutate(p.id);
                        }
                      }}
                      className="flex items-center gap-1 rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-all"
                    >
                      <Trash2 className="h-3 w-3" />
                      Eliminar
                    </button>
                  )}
                </div>

                {/* Formulario de abono */}
                {showPagoForm === p.id && (
                  <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <p className="mb-3 text-sm font-medium text-gray-700">
                      Abono a <span className="font-bold">{p.person_name}</span> | Pendiente: <span className="font-bold text-yellow-600">{formatCurrency(p.remaining)}</span>
                    </p>
                    <p className="mb-3 text-xs text-blue-700 flex items-center gap-1">
                      <ShieldAlert className="h-3 w-3" />
                      Este abono se descuenta de la categoria Inversion. Debe haber inversion suficiente para realizarlo.
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">Monto *</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={pagoForm.amount}
                          onChange={(e) => setPagoForm({ ...pagoForm, amount: e.target.value })}
                          className="input-premium"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">Recibido en *</label>
                        <select
                          value={pagoForm.payment_method}
                          onChange={(e) => setPagoForm({ ...pagoForm, payment_method: e.target.value })}
                          className="input-premium"
                        >
                          <option value="efectivo">Efectivo</option>
                          <option value="nequi">Nequi</option>
                          <option value="bancolombia">Bancolombia</option>
                          <option value="bogota">Banco de Bogota</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">Fecha</label>
                        <input
                          type="date"
                          value={pagoForm.payment_date}
                          onChange={(e) => setPagoForm({ ...pagoForm, payment_date: e.target.value })}
                          className="input-premium"
                        />
                      </div>
                    </div>
                    <div className="mt-3">
                      <label className="mb-1 block text-xs font-medium text-gray-600">Notas</label>
                      <input
                        type="text"
                        value={pagoForm.notes}
                        onChange={(e) => setPagoForm({ ...pagoForm, notes: e.target.value })}
                        className="input-premium"
                        placeholder="Opcional"
                      />
                    </div>
                    <button
                      onClick={() => handlePago(p.id)}
                      disabled={pagoMutation.isPending || !pagoForm.amount}
                      className="mt-3 w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-all"
                    >
                      {pagoMutation.isPending ? "Registrando..." : "Registrar Abono (descuenta de Inversion)"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
