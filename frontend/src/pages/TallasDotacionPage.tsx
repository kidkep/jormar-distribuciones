import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  dotacionApi,
  type DotacionEmpresa,
  type DotacionCatalogoProduct,
} from "@/api/dotacion.api";
import { quotesApi } from "@/api/quotes.api";
import { Mannequin3D, detectGarmentType, GARMENT_LABELS } from "@/components/dotacion/Mannequin3D";
import { formatCurrency } from "@/lib/utils";
import { EmptyState } from "@/components/common/TableStates";
import {
  Search, Plus, Trash2, Building2, User, Shirt, X, Package, History,
  Ruler, FileText, UserPlus, Check, RotateCw,
} from "lucide-react";

const COLOR_HEX: Record<string, string> = {
  Negro: "#1f1f1f", Blanco: "#f4f4f2", Gris: "#8a8a8a", Azul: "#1e40af",
  Rojo: "#b91c1c", Verde: "#166534", Amarillo: "#eab308", Naranja: "#ea580c",
  Cafe: "#6b4423", Beige: "#d6c7a1", Vino: "#7f1d1d", Cielo: "#87ceeb", Tony: "#c0803a",
};

const NUMERIC_SIZES = ["28", "30", "32", "34", "36", "38", "40", "42", "44", "46", "48"];

const blankEmpresa = { name: "", document: "", phone: "", contact_name: "", address: "", notes: "" };
const blankPersona = { full_name: "", document: "", position: "", phone: "", notes: "" };

export function TallasDotacionPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"empresas" | "personales">("empresas");
  const [search, setSearch] = useState("");
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<number | null>(null);
  const [selectedPersonaId, setSelectedPersonaId] = useState<number | null>(null);

  const [preview, setPreview] = useState({ product_id: 0, product_name: "", size: "M", color: "Azul" });
  const [productQuery, setProductQuery] = useState("");

  const [showEmpresaModal, setShowEmpresaModal] = useState(false);
  const [showPersonaModal, setShowPersonaModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [empresaForm, setEmpresaForm] = useState(blankEmpresa);
  const [personaForm, setPersonaForm] = useState(blankPersona);
  const [histForm, setHistForm] = useState({
    product_id: 0, size: "M", color: "Azul", quantity: 1, note: "",
    dotacion_date: new Date().toISOString().split("T")[0],
  });
  const [quoteForm, setQuoteForm] = useState({ quote_id: 0, quantity: 1, unit_price: 0 });

  const { data: catalogo } = useQuery({ queryKey: ["dotacion-catalogo"], queryFn: dotacionApi.getCatalogo });
  const { data: empresas } = useQuery({ queryKey: ["dotacion-empresas", search], queryFn: () => dotacionApi.listEmpresas(search) });
  const { data: personales } = useQuery({ queryKey: ["dotacion-personales", search], queryFn: () => dotacionApi.listPersonas("personal", search) });
  const { data: empleados } = useQuery({
    queryKey: ["dotacion-empleados", selectedEmpresaId],
    queryFn: () => dotacionApi.listPersonas("empresa", "", selectedEmpresaId as number),
    enabled: !!selectedEmpresaId,
  });
  const { data: resumen } = useQuery({
    queryKey: ["dotacion-resumen", selectedEmpresaId],
    queryFn: () => dotacionApi.resumenEmpresa(selectedEmpresaId as number),
    enabled: !!selectedEmpresaId,
  });
  const { data: persona } = useQuery({
    queryKey: ["dotacion-persona", selectedPersonaId],
    queryFn: () => dotacionApi.getPersona(selectedPersonaId as number),
    enabled: !!selectedPersonaId,
  });
  const { data: quotes } = useQuery({
    queryKey: ["quotes-dotacion"],
    queryFn: () => quotesApi.list(1, 100),
    enabled: showQuoteModal,
  });

  const empresaActual = useMemo(
    () => (empresas || []).find((e) => e.id === selectedEmpresaId) || null,
    [empresas, selectedEmpresaId],
  );

  const products = catalogo?.products ?? [];
  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return products.slice(0, 8);
    return products
      .filter((p) => p.name.toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q))
      .slice(0, 8);
  }, [products, productQuery]);

  const garmentKey = preview.product_name ? detectGarmentType(preview.product_name) || "generic" : null;
  const colorHex = COLOR_HEX[preview.color] || "#c0803a";
  const allSizes = [...(catalogo?.sizes || []), ...NUMERIC_SIZES];

  useEffect(() => {
    if (persona && persona.tallas.length > 0) {
      const t = persona.tallas[0];
      setPreview({ product_id: t.product_id, product_name: t.product?.name || "", size: t.size, color: t.color || "Azul" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persona?.id]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["dotacion-empresas"] });
    queryClient.invalidateQueries({ queryKey: ["dotacion-personales"] });
    queryClient.invalidateQueries({ queryKey: ["dotacion-empleados", selectedEmpresaId] });
    queryClient.invalidateQueries({ queryKey: ["dotacion-resumen", selectedEmpresaId] });
    queryClient.invalidateQueries({ queryKey: ["dotacion-persona", selectedPersonaId] });
  };

  const createEmpresa = useMutation({
    mutationFn: dotacionApi.createEmpresa,
    onSuccess: (emp: DotacionEmpresa) => {
      queryClient.invalidateQueries({ queryKey: ["dotacion-empresas"] });
      setShowEmpresaModal(false);
      setEmpresaForm(blankEmpresa);
      setSelectedEmpresaId(emp.id);
      setSelectedPersonaId(null);
      setError(null);
    },
    onError: (e: any) => setError(e?.response?.data?.detail || "Error al crear empresa"),
  });

  const deleteEmpresa = useMutation({
    mutationFn: dotacionApi.deleteEmpresa,
    onSuccess: () => {
      setSelectedEmpresaId(null);
      setSelectedPersonaId(null);
      invalidateAll();
    },
  });

  const createPersona = useMutation({
    mutationFn: dotacionApi.createPersona,
    onSuccess: (p) => {
      invalidateAll();
      setShowPersonaModal(false);
      setPersonaForm(blankPersona);
      setSelectedPersonaId(p.id);
      setError(null);
    },
    onError: (e: any) => setError(e?.response?.data?.detail || "Error al crear persona"),
  });

  const deletePersona = useMutation({
    mutationFn: dotacionApi.deletePersona,
    onSuccess: () => {
      setSelectedPersonaId(null);
      invalidateAll();
    },
  });

  const upsertTalla = useMutation({
    mutationFn: () =>
      dotacionApi.upsertTalla(selectedPersonaId as number, {
        product_id: preview.product_id,
        size: preview.size,
        color: preview.color,
      }),
    onSuccess: () => {
      invalidateAll();
      setError(null);
    },
    onError: (e: any) => setError(e?.response?.data?.detail || "Error al guardar la talla"),
  });

  const deleteTalla = useMutation({
    mutationFn: (tallaId: number) => dotacionApi.deleteTalla(selectedPersonaId as number, tallaId),
    onSuccess: invalidateAll,
  });

  const addHistorial = useMutation({
    mutationFn: () =>
      dotacionApi.addHistorial(selectedPersonaId as number, {
        product_id: histForm.product_id,
        size: histForm.size,
        color: histForm.color,
        quantity: histForm.quantity,
        note: histForm.note || null,
        dotacion_date: histForm.dotacion_date,
      }),
    onSuccess: () => {
      invalidateAll();
      setError(null);
    },
    onError: (e: any) => setError(e?.response?.data?.detail || "Error al registrar la entrega"),
  });

  const addToQuote = useMutation({
    mutationFn: () =>
      quotesApi.addItems(quoteForm.quote_id, [
        { product_id: preview.product_id, quantity: quoteForm.quantity, unit_price: quoteForm.unit_price },
      ]),
    onSuccess: () => {
      setShowQuoteModal(false);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
    },
    onError: (e: any) => setError(e?.response?.data?.detail || "Error al agregar a la cotización"),
  });

  const selectEmpresa = (id: number) => {
    setSelectedEmpresaId(id);
    setSelectedPersonaId(null);
  };

  const openQuoteModal = () => {
    const prod = products.find((p) => p.id === preview.product_id);
    setQuoteForm({ quote_id: quoteForm.quote_id, quantity: 1, unit_price: prod?.sale_price || 0 });
    setShowQuoteModal(true);
  };

  const tallaOptions = persona?.tallas ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tallas y Dotación</h1>
          <p className="text-sm text-gray-500">Perfiles de tallas, dotación de personal y probador virtual 3D</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setEmpresaForm(blankEmpresa); setShowEmpresaModal(true); }}
            className="btn-gold inline-flex items-center gap-2"
          >
            <Building2 className="h-4 w-4" /> Nueva Empresa
          </button>
          <button
            onClick={() => { setPersonaForm(blankPersona); setShowPersonaModal(true); }}
            className="btn-gold inline-flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" /> Nueva Persona
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[300px_minmax(0,1fr)_360px]">
        {/* Columna izquierda: navegación */}
        <div className="card-premium flex max-h-[70vh] flex-col p-4">
          <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1">
            <button
              onClick={() => setTab("empresas")}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${tab === "empresas" ? "bg-white text-gray-900 shadow" : "text-gray-500"}`}
            >
              Empresas
            </button>
            <button
              onClick={() => setTab("personales")}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${tab === "personales" ? "bg-white text-gray-900 shadow" : "text-gray-500"}`}
            >
              Personales
            </button>
          </div>

          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="input-premium pl-9"
            />
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto pr-1">
            {tab === "empresas" ? (
              <>
                {(empresas || []).map((emp) => (
                  <div key={emp.id}>
                    <button
                      onClick={() => selectEmpresa(emp.id)}
                      className={`w-full rounded-xl border p-3 text-left transition ${selectedEmpresaId === emp.id ? "border-gold-400 bg-gold-50" : "border-gray-200 hover:border-gold-200"}`}
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gold-600" />
                        <span className="truncate font-medium text-gray-900">{emp.name}</span>
                      </div>
                      <span className="text-xs text-gray-500">{emp.employee_count} empleado(s)</span>
                    </button>

                    {selectedEmpresaId === emp.id && (
                      <div className="mt-2 space-y-1 border-l-2 border-gold-200 pl-2">
                        {empleados && empleados.length > 0 ? (
                          empleados.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => setSelectedPersonaId(p.id)}
                              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition ${selectedPersonaId === p.id ? "bg-gold-100 text-gray-900" : "text-gray-600 hover:bg-gray-50"}`}
                            >
                              <User className="h-3.5 w-3.5" />
                              <span className="truncate">{p.full_name}</span>
                            </button>
                          ))
                        ) : (
                          <p className="px-2 py-1 text-xs text-gray-400">Sin empleados</p>
                        )}
                        <button
                          onClick={() => { setPersonaForm({ ...blankPersona }); setShowPersonaModal(true); }}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-gold-600 hover:bg-gold-50"
                        >
                          <Plus className="h-3.5 w-3.5" /> Agregar empleado
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {(!empresas || empresas.length === 0) && <p className="py-6 text-center text-sm text-gray-400">Sin empresas</p>}
              </>
            ) : (
              <>
                {(personales || []).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedEmpresaId(null); setSelectedPersonaId(p.id); }}
                    className={`w-full rounded-xl border p-3 text-left transition ${selectedPersonaId === p.id ? "border-gold-400 bg-gold-50" : "border-gray-200 hover:border-gold-200"}`}
                  >
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gold-600" />
                      <span className="truncate font-medium text-gray-900">{p.full_name}</span>
                    </div>
                    <span className="text-xs text-gray-500">{p.tallas.length} talla(s)</span>
                  </button>
                ))}
                {(!personales || personales.length === 0) && <p className="py-6 text-center text-sm text-gray-400">Sin clientes personales</p>}
              </>
            )}
          </div>
        </div>

        {/* Columna central: probador 3D */}
        <div className="card-premium p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold text-gray-900">
              <Shirt className="h-5 w-5 text-gold-600" /> Probador Virtual
            </h2>
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <RotateCw className="h-3.5 w-3.5" /> Gira y hace zoom
            </span>
          </div>

          <div className="overflow-hidden rounded-2xl bg-gradient-to-b from-gray-900 to-gray-800">
            <Mannequin3D garment={garmentKey} size={preview.size} color={colorHex} height={380} />
          </div>

          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="font-medium text-gray-900">{preview.product_name || "Selecciona una prenda"}</span>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
              {garmentKey ? GARMENT_LABELS[garmentKey] || "Prenda" : "—"} · {preview.size}
            </span>
          </div>

          {/* Selector de prenda */}
          <div className="mt-3">
            <label className="mb-1.5 block text-xs font-medium text-gray-500">Prenda</label>
            <div className="relative">
              <Package className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                placeholder="Buscar producto..."
                className="input-premium pl-9"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {filteredProducts.map((p: DotacionCatalogoProduct) => (
                <button
                  key={p.id}
                  onClick={() => { setPreview({ ...preview, product_id: p.id, product_name: p.name }); setProductQuery(""); }}
                  className={`rounded-lg border px-2.5 py-1 text-xs transition ${preview.product_id === p.id ? "border-gold-400 bg-gold-50 text-gray-900" : "border-gray-200 text-gray-600 hover:border-gold-200"}`}
                >
                  {p.name}
                </button>
              ))}
              {filteredProducts.length === 0 && <span className="text-xs text-gray-400">Sin coincidencias</span>}
            </div>
          </div>

          {/* Tallas */}
          <div className="mt-3">
            <label className="mb-1.5 flex items-center gap-1 text-xs font-medium text-gray-500">
              <Ruler className="h-3.5 w-3.5" /> Talla
            </label>
            <div className="flex flex-wrap gap-1.5">
              {allSizes.map((s) => (
                <button
                  key={s}
                  onClick={() => setPreview({ ...preview, size: s })}
                  className={`min-w-[2.4rem] rounded-lg border px-2 py-1 text-xs font-semibold transition ${preview.size === s ? "border-gold-500 bg-gold-500 text-white" : "border-gray-200 text-gray-600 hover:border-gold-300"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div className="mt-3">
            <label className="mb-1.5 block text-xs font-medium text-gray-500">Color</label>
            <div className="flex flex-wrap gap-2">
              {(catalogo?.colors || []).map((c) => (
                <button
                  key={c}
                  title={c}
                  onClick={() => setPreview({ ...preview, color: c })}
                  className={`h-7 w-7 rounded-full border-2 transition ${preview.color === c ? "border-gold-500 ring-2 ring-gold-200" : "border-gray-200"}`}
                  style={{ backgroundColor: COLOR_HEX[c] || "#c0803a" }}
                />
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => upsertTalla.mutate()}
              disabled={!selectedPersonaId || !preview.product_id || upsertTalla.isPending}
              className="btn-gold inline-flex flex-1 items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check className="h-4 w-4" /> Guardar talla
            </button>
            <button
              onClick={openQuoteModal}
              disabled={!preview.product_id}
              className="btn-gold inline-flex flex-1 items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileText className="h-4 w-4" /> Agregar a cotización
            </button>
          </div>
          {!selectedPersonaId && (
            <p className="mt-2 text-center text-xs text-gray-400">Selecciona una persona para guardar su talla</p>
          )}
        </div>

        {/* Columna derecha: detalle */}
        <div className="space-y-4">
          {persona ? (
            <>
              <div className="card-premium p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-semibold text-gray-900">{persona.full_name}</h2>
                    <p className="text-xs text-gray-500">
                      {persona.company_name ? `Empresa: ${persona.company_name}` : "Cliente personal"}
                      {persona.position ? ` · ${persona.position}` : ""}
                    </p>
                    {persona.document && <p className="text-xs text-gray-400">Doc: {persona.document}</p>}
                    {persona.phone && <p className="text-xs text-gray-400">Tel: {persona.phone}</p>}
                  </div>
                  <button
                    onClick={() => deletePersona.mutate(persona.id)}
                    className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="card-premium p-4">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <Ruler className="h-4 w-4 text-gold-600" /> Tallas registradas
                </h3>
                {tallaOptions.length === 0 ? (
                  <p className="text-xs text-gray-400">Sin tallas registradas</p>
                ) : (
                  <div className="space-y-2">
                    {tallaOptions.map((t) => (
                      <div key={t.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm text-gray-800">{t.product?.name || `Producto #${t.product_id}`}</p>
                          <p className="text-xs text-gray-500">
                            Talla {t.size}{t.color ? ` · ${t.color}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setPreview({ product_id: t.product_id, product_name: t.product?.name || "", size: t.size, color: t.color || "Azul" })}
                            className="rounded-md px-2 py-1 text-xs text-gold-600 hover:bg-gold-50"
                          >
                            Probar
                          </button>
                          <button
                            onClick={() => deleteTalla.mutate(t.id)}
                            className="rounded-md p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card-premium p-4">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <Package className="h-4 w-4 text-gold-600" /> Registrar entrega
                </h3>
                <div className="space-y-2">
                  <select
                    value={histForm.product_id}
                    onChange={(e) => setHistForm({ ...histForm, product_id: Number(e.target.value) })}
                    className="input-premium"
                  >
                    <option value={0}>Selecciona producto</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <select value={histForm.size} onChange={(e) => setHistForm({ ...histForm, size: e.target.value })} className="input-premium">
                      {allSizes.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select value={histForm.color} onChange={(e) => setHistForm({ ...histForm, color: e.target.value })} className="input-premium">
                      {(catalogo?.colors || []).map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={histForm.quantity}
                      onChange={(e) => setHistForm({ ...histForm, quantity: Number(e.target.value) || 1 })}
                      className="input-premium"
                      placeholder="Cantidad"
                    />
                    <input
                      type="date"
                      value={histForm.dotacion_date}
                      onChange={(e) => setHistForm({ ...histForm, dotacion_date: e.target.value })}
                      className="input-premium"
                    />
                  </div>
                  <input
                    value={histForm.note}
                    onChange={(e) => setHistForm({ ...histForm, note: e.target.value })}
                    className="input-premium"
                    placeholder="Nota (opcional)"
                  />
                  <button
                    onClick={() => addHistorial.mutate()}
                    disabled={!histForm.product_id || addHistorial.isPending}
                    className="btn-gold w-full disabled:opacity-50"
                  >
                    Registrar entrega
                  </button>
                </div>
              </div>

              <div className="card-premium p-4">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <History className="h-4 w-4 text-gold-600" /> Historial
                </h3>
                {persona.historial.length === 0 ? (
                  <p className="text-xs text-gray-400">Sin entregas registradas</p>
                ) : (
                  <div className="max-h-56 space-y-2 overflow-y-auto">
                    {persona.historial.map((h) => (
                      <div key={h.id} className="rounded-lg border border-gray-100 px-3 py-2">
                        <p className="text-sm text-gray-800">{h.product?.name || `Producto #${h.product_id}`}</p>
                        <p className="text-xs text-gray-500">
                          {h.quantity} und · Talla {h.size}{h.color ? ` · ${h.color}` : ""} · {h.dotacion_date}
                        </p>
                        {h.note && <p className="text-xs italic text-gray-400">{h.note}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : empresaActual ? (
            <>
              <div className="card-premium p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-semibold text-gray-900">{empresaActual.name}</h2>
                    {empresaActual.contact_name && <p className="text-xs text-gray-500">Contacto: {empresaActual.contact_name}</p>}
                    {empresaActual.document && <p className="text-xs text-gray-400">NIT: {empresaActual.document}</p>}
                    {empresaActual.phone && <p className="text-xs text-gray-400">Tel: {empresaActual.phone}</p>}
                    {empresaActual.address && <p className="text-xs text-gray-400">{empresaActual.address}</p>}
                  </div>
                  <button
                    onClick={() => deleteEmpresa.mutate(empresaActual.id)}
                    className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <button
                  onClick={() => { setPersonaForm(blankPersona); setShowPersonaModal(true); }}
                  className="btn-gold mt-3 inline-flex w-full items-center justify-center gap-2"
                >
                  <UserPlus className="h-4 w-4" /> Agregar empleado
                </button>
              </div>

              <div className="card-premium p-4">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <Package className="h-4 w-4 text-gold-600" /> Resumen de dotación
                </h3>
                {!resumen || resumen.length === 0 ? (
                  <p className="text-xs text-gray-400">Sin dotación registrada</p>
                ) : (
                  <div className="max-h-72 space-y-2 overflow-y-auto">
                    {resumen.map((r, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm text-gray-800">{r.product_name}</p>
                          <p className="text-xs text-gray-500">
                            Talla {r.size}{r.color ? ` · ${r.color}` : ""}
                          </p>
                        </div>
                        <span className="rounded-full bg-gold-100 px-2.5 py-0.5 text-xs font-semibold text-gold-700">
                          {r.count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="card-premium p-6">
              <EmptyState
                icon={Shirt}
                title="Selecciona una empresa o persona"
                description="Administra tallas, dotación y prueba las prendas en 3D."
              />
            </div>
          )}
        </div>
      </div>

      {/* Modal empresa */}
      {showEmpresaModal && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="modal-content w-full max-w-lg rounded-2xl p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Nueva Empresa</h2>
              <button onClick={() => setShowEmpresaModal(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); createEmpresa.mutate(empresaForm); }}
              className="space-y-4"
            >
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Nombre</label>
                <input value={empresaForm.name} onChange={(e) => setEmpresaForm({ ...empresaForm, name: e.target.value })} className="input-premium" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">NIT / Documento</label>
                  <input value={empresaForm.document} onChange={(e) => setEmpresaForm({ ...empresaForm, document: e.target.value })} className="input-premium" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Teléfono</label>
                  <input value={empresaForm.phone} onChange={(e) => setEmpresaForm({ ...empresaForm, phone: e.target.value })} className="input-premium" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Contacto</label>
                <input value={empresaForm.contact_name} onChange={(e) => setEmpresaForm({ ...empresaForm, contact_name: e.target.value })} className="input-premium" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Dirección</label>
                <input value={empresaForm.address} onChange={(e) => setEmpresaForm({ ...empresaForm, address: e.target.value })} className="input-premium" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Notas</label>
                <textarea value={empresaForm.notes} onChange={(e) => setEmpresaForm({ ...empresaForm, notes: e.target.value })} className="input-premium" rows={2} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowEmpresaModal(false)} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit" disabled={createEmpresa.isPending} className="btn-gold disabled:opacity-50">
                  {createEmpresa.isPending ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal persona */}
      {showPersonaModal && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="modal-content w-full max-w-lg rounded-2xl p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {selectedEmpresaId ? `Nuevo Empleado · ${empresaActual?.name || ""}` : "Nueva Persona"}
              </h2>
              <button onClick={() => setShowPersonaModal(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createPersona.mutate({
                  ...personaForm,
                  company_id: selectedEmpresaId,
                  client_id: null,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Nombre completo</label>
                <input value={personaForm.full_name} onChange={(e) => setPersonaForm({ ...personaForm, full_name: e.target.value })} className="input-premium" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Documento</label>
                  <input value={personaForm.document} onChange={(e) => setPersonaForm({ ...personaForm, document: e.target.value })} className="input-premium" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Cargo</label>
                  <input value={personaForm.position} onChange={(e) => setPersonaForm({ ...personaForm, position: e.target.value })} className="input-premium" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Teléfono</label>
                <input value={personaForm.phone} onChange={(e) => setPersonaForm({ ...personaForm, phone: e.target.value })} className="input-premium" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Notas</label>
                <textarea value={personaForm.notes} onChange={(e) => setPersonaForm({ ...personaForm, notes: e.target.value })} className="input-premium" rows={2} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowPersonaModal(false)} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit" disabled={createPersona.isPending} className="btn-gold disabled:opacity-50">
                  {createPersona.isPending ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal agregar a cotización */}
      {showQuoteModal && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="modal-content w-full max-w-md rounded-2xl p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Agregar a cotización</h2>
              <button onClick={() => setShowQuoteModal(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="rounded-xl border border-gold-200 bg-gold-50 px-4 py-3">
                <p className="text-sm font-medium text-gray-900">{preview.product_name}</p>
                <p className="text-xs text-gray-500">Talla {preview.size} · {preview.color}</p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Cotización</label>
                <select
                  value={quoteForm.quote_id}
                  onChange={(e) => setQuoteForm({ ...quoteForm, quote_id: Number(e.target.value) })}
                  className="input-premium"
                >
                  <option value={0}>Selecciona cotización</option>
                  {(quotes || []).map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.quote_number} · {q.client?.name || q.client_name || "Sin cliente"} · {formatCurrency(q.total)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Cantidad</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={quoteForm.quantity}
                    onChange={(e) => setQuoteForm({ ...quoteForm, quantity: Number(e.target.value) || 1 })}
                    className="input-premium"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Precio unitario</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={quoteForm.unit_price}
                    onChange={(e) => setQuoteForm({ ...quoteForm, unit_price: Number(e.target.value) || 0 })}
                    className="input-premium"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowQuoteModal(false)} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
                  Cancelar
                </button>
                <button
                  onClick={() => addToQuote.mutate()}
                  disabled={!quoteForm.quote_id || addToQuote.isPending}
                  className="btn-gold disabled:opacity-50"
                >
                  {addToQuote.isPending ? "Agregando..." : "Agregar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}