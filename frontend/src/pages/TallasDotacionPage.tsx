import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  dotacionApi,
  type DotacionEmpresa,
  type DotacionCatalogoProduct,
} from "@/api/dotacion.api";
import { quotesApi } from "@/api/quotes.api";
import {
  Mannequin3D,
  detectGarmentType,
  GARMENT_LABELS,
  type Gender,
  type ViewName,
  type BackgroundName,
} from "@/components/dotacion/Mannequin3D";
import { formatCurrency } from "@/lib/utils";
import { EmptyState } from "@/components/common/TableStates";
import {
  Search, Plus, Trash2, Building2, User, Shirt, X, Package, History,
  Ruler, FileText, UserPlus, Check, RotateCw, Save, Eye, Palette,
} from "lucide-react";

const COLOR_HEX: Record<string, string> = {
  Negro: "#1f1f1f", Blanco: "#f4f4f2", Gris: "#8a8a8a", Azul: "#1e40af",
  Rojo: "#b91c1c", Verde: "#166534", Amarillo: "#eab308", Naranja: "#ea580c",
  Cafe: "#6b4423", Beige: "#d6c7a1", Vino: "#7f1d1d", Cielo: "#87ceeb", Tony: "#c0803a",
  Petroleo: "#0f5c63", Fucsia: "#c026d3", Morado: "#6d28d9",
};

const VIEWS: { key: ViewName; label: string }[] = [
  { key: "front", label: "Frente" },
  { key: "back", label: "Atrás" },
  { key: "left", label: "Izq." },
  { key: "right", label: "Der." },
  { key: "three", label: "3/4" },
];

const BACKGROUNDS: { key: BackgroundName; label: string; css: string }[] = [
  { key: "studio", label: "Estudio", css: "linear-gradient(#eef2f8,#b3b9c5)" },
  { key: "white", label: "Blanco", css: "#f4f5f8" },
  { key: "gray", label: "Gris", css: "#767c86" },
  { key: "dark", label: "Oscuro", css: "#14161b" },
];

interface OutfitItem {
  key: string;
  product_id: number;
  name: string;
  type: string;
  layer: string;
  size: string;
  color: string;
  sale_price: number;
  garmentGender: string;
}

const blankEmpresa = { name: "", document: "", phone: "", contact_name: "", address: "", notes: "" };
const blankPersona = { full_name: "", document: "", position: "", phone: "", notes: "" };

export function TallasDotacionPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"empresas" | "personales">("empresas");
  const [search, setSearch] = useState("");
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<number | null>(null);
  const [selectedPersonaId, setSelectedPersonaId] = useState<number | null>(null);

  const [gender, setGender] = useState<Gender>("hombre");
  const [outfit, setOutfit] = useState<OutfitItem[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [background, setBackground] = useState<BackgroundName>("studio");
  const [view, setView] = useState<ViewName>("front");
  const [resetNonce, setResetNonce] = useState(0);
  const [productQuery, setProductQuery] = useState("");
  const [layerFilter, setLayerFilter] = useState<string>("all");

  const [showEmpresaModal, setShowEmpresaModal] = useState(false);
  const [showPersonaModal, setShowPersonaModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [empresaForm, setEmpresaForm] = useState(blankEmpresa);
  const [personaForm, setPersonaForm] = useState(blankPersona);
  const [histForm, setHistForm] = useState({
    product_id: 0, size: "M", color: "Negro", quantity: 1, note: "",
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

  const colors = catalogo?.colors ?? [];
  const layers = catalogo?.layers ?? [];
  const products = catalogo?.products ?? [];
  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const empresaActual = useMemo(
    () => (empresas || []).find((e) => e.id === selectedEmpresaId) || null,
    [empresas, selectedEmpresaId],
  );

  const layerLabel = (key: string) => layers.find((l) => l.key === key)?.label || key;

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (layerFilter !== "all" && (p.layer || "otros") !== layerFilter) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q);
    });
  }, [products, productQuery, layerFilter]);

  const groupedProducts = useMemo(() => {
    const order = ["all", ...layers.map((l) => l.key)];
    const map = new Map<string, DotacionCatalogoProduct[]>();
    for (const p of filteredProducts) {
      const key = p.layer || "otros";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return order.filter((k) => k !== "all" && map.has(k)).map((k) => ({ key: k, items: map.get(k)! }))
      .concat(map.has("otros") ? [{ key: "otros", items: map.get("otros")! }] : []);
  }, [filteredProducts, layers]);

  const selected = useMemo(() => outfit.find((o) => o.key === selectedKey) || null, [outfit, selectedKey]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["dotacion-empresas"] });
    queryClient.invalidateQueries({ queryKey: ["dotacion-personales"] });
    queryClient.invalidateQueries({ queryKey: ["dotacion-empleados", selectedEmpresaId] });
    queryClient.invalidateQueries({ queryKey: ["dotacion-resumen", selectedEmpresaId] });
    queryClient.invalidateQueries({ queryKey: ["dotacion-persona", selectedPersonaId] });
  };

  // Cargar dotación (tallas) de la persona en el probador
  useEffect(() => {
    if (!persona || products.length === 0) return;
    const items: OutfitItem[] = persona.tallas.map((t) => {
      const p = productMap.get(t.product_id);
      const type = p?.garment_type || detectGarmentType(p?.name || t.product?.name || "") || "camiseta";
      return {
        key: `p-${t.product_id}`,
        product_id: t.product_id,
        name: p?.name || t.product?.name || `Producto #${t.product_id}`,
        type,
        layer: p?.layer || "top",
        size: t.size,
        color: t.color || "Negro",
        sale_price: p?.sale_price || 0,
        garmentGender: p?.gender || "unisex",
      };
    });
    setOutfit(items);
    setSelectedKey(items[0]?.key ?? null);
    const fem = items.filter((i) => i.garmentGender === "mujer").length;
    const mas = items.filter((i) => i.garmentGender === "hombre").length;
    if (fem > mas && fem > 0) setGender("mujer");
    else if (mas > 0) setGender("hombre");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persona?.id, products.length]);

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
      setOutfit([]);
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
      setOutfit([]);
      setError(null);
    },
    onError: (e: any) => setError(e?.response?.data?.detail || "Error al crear persona"),
  });

  const deletePersona = useMutation({
    mutationFn: dotacionApi.deletePersona,
    onSuccess: () => {
      setSelectedPersonaId(null);
      setOutfit([]);
      invalidateAll();
    },
  });

  const deleteTalla = useMutation({
    mutationFn: (tallaId: number) => dotacionApi.deleteTalla(selectedPersonaId as number, tallaId),
    onSuccess: invalidateAll,
  });

  const saveOutfit = useMutation({
    mutationFn: async (spec: { single?: OutfitItem }) => {
      if (!selectedPersonaId) return;
      const targets = spec.single ? [spec.single] : outfit;
      for (const item of targets) {
        await dotacionApi.upsertTalla(selectedPersonaId, {
          product_id: item.product_id,
          size: item.size,
          color: item.color,
        });
      }
    },
    onSuccess: () => {
      invalidateAll();
      setError(null);
    },
    onError: (e: any) => setError(e?.response?.data?.detail || "Error al guardar la dotación"),
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
        { product_id: selected!.product_id, quantity: quoteForm.quantity, unit_price: quoteForm.unit_price },
      ]),
    onSuccess: () => {
      setShowQuoteModal(false);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
    },
    onError: (e: any) => setError(e?.response?.data?.detail || "Error al agregar a la cotización"),
  });

  const addProduct = (p: DotacionCatalogoProduct) => {
    const key = `p-${p.id}`;
    if (outfit.some((o) => o.key === key)) {
      setSelectedKey(key);
      return;
    }
    const type = p.garment_type || detectGarmentType(p.name) || "camiseta";
    const item: OutfitItem = {
      key,
      product_id: p.id,
      name: p.name,
      type,
      layer: p.layer || "top",
      size: p.sizes?.[0] || "M",
      color: colors[0] || "Negro",
      sale_price: p.sale_price || 0,
      garmentGender: p.gender || "unisex",
    };
    setOutfit((prev) => [...prev, item]);
    setSelectedKey(key);
  };

  const updateSelected = (patch: Partial<OutfitItem>) => {
    if (!selectedKey) return;
    setOutfit((prev) => prev.map((o) => (o.key === selectedKey ? { ...o, ...patch } : o)));
  };

  const removeItem = (item: OutfitItem) => {
    setOutfit((prev) => prev.filter((o) => o.key !== item.key));
    if (selectedKey === item.key) setSelectedKey(null);
    const talla = persona?.tallas.find((t) => t.product_id === item.product_id);
    if (talla && selectedPersonaId) deleteTalla.mutate(talla.id);
  };

  const selectEmpresa = (id: number) => {
    setSelectedEmpresaId(id || null);
    setSelectedPersonaId(null);
    setOutfit([]);
    setSelectedKey(null);
  };
  const selectPersona = (id: number) => {
    setSelectedPersonaId(id || null);
    if (!id) {
      setOutfit([]);
      setSelectedKey(null);
    }
  };

  const openQuoteModal = () => {
    if (!selected) return;
    setQuoteForm({ quote_id: quoteForm.quote_id, quantity: 1, unit_price: selected.sale_price || 0 });
    setShowQuoteModal(true);
  };

  const outfitFor3D = outfit.map((o) => ({
    key: o.key,
    type: o.type,
    layer: o.layer,
    size: o.size,
    color: COLOR_HEX[o.color] || "#c0803a",
  }));

  const empleadosDeEmpresa = empleados || [];
  const personalesList = personales || [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tallas y Dotación</h1>
          <p className="text-sm text-gray-500">Probador virtual 3D con prendas por capas, tallas y dotación de personal</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setEmpresaForm(blankEmpresa); setShowEmpresaModal(true); }} className="btn-gold inline-flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Nueva Empresa
          </button>
          <button onClick={() => { setPersonaForm(blankPersona); setShowPersonaModal(true); }} className="btn-gold inline-flex items-center gap-2">
            <UserPlus className="h-4 w-4" /> Nueva Persona
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Barra de perfil */}
      <div className="card-premium flex flex-wrap items-center gap-3 p-3">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1">
          <button onClick={() => setTab("empresas")} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${tab === "empresas" ? "bg-white text-gray-900 shadow" : "text-gray-500"}`}>
            Empresas
          </button>
          <button onClick={() => setTab("personales")} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${tab === "personales" ? "bg-white text-gray-900 shadow" : "text-gray-500"}`}>
            Personales
          </button>
        </div>

        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar empresa o persona..." className="input-premium pl-9" />
        </div>

        {tab === "empresas" ? (
          <>
            <select value={selectedEmpresaId ?? 0} onChange={(e) => selectEmpresa(Number(e.target.value))} className="input-premium min-w-[200px] flex-1">
              <option value={0}>Selecciona empresa</option>
              {(empresas || []).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <select value={selectedPersonaId ?? 0} onChange={(e) => selectPersona(Number(e.target.value))} disabled={!selectedEmpresaId} className="input-premium min-w-[200px] flex-1 disabled:opacity-50">
              <option value={0}>Selecciona empleado</option>
              {empleadosDeEmpresa.map((p) => <option key={p.id} value={p.id}>{p.full_name}{p.position ? ` · ${p.position}` : ""}</option>)}
            </select>
          </>
        ) : (
          <select value={selectedPersonaId ?? 0} onChange={(e) => selectPersona(Number(e.target.value))} className="input-premium min-w-[200px] flex-1">
            <option value={0}>Selecciona cliente personal</option>
            {personalesList.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        )}

        {selectedPersonaId && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-100 px-3 py-1.5 text-xs font-semibold text-gold-700">
            <User className="h-3.5 w-3.5" /> {persona?.full_name || "Cargando..."}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[300px_minmax(0,1fr)_360px]">
        {/* Columna 1: productos */}
        <div className="card-premium flex max-h-[78vh] flex-col p-4">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
            <Package className="h-5 w-5 text-gold-600" /> Productos
          </h2>
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input value={productQuery} onChange={(e) => setProductQuery(e.target.value)} placeholder="Buscar prenda..." className="input-premium pl-9" />
          </div>
          <div className="mb-2 flex flex-wrap gap-1.5">
            <button onClick={() => setLayerFilter("all")} className={`rounded-lg border px-2 py-0.5 text-xs transition ${layerFilter === "all" ? "border-gold-400 bg-gold-50 text-gray-900" : "border-gray-200 text-gray-600"}`}>
              Todas
            </button>
            {layers.map((l) => (
              <button key={l.key} onClick={() => setLayerFilter(l.key)} className={`rounded-lg border px-2 py-0.5 text-xs transition ${layerFilter === l.key ? "border-gold-400 bg-gold-50 text-gray-900" : "border-gray-200 text-gray-600"}`}>
                {l.label}
              </button>
            ))}
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {groupedProducts.map((group) => (
              <div key={group.key}>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{layerLabel(group.key)}</p>
                <div className="space-y-1.5">
                  {group.items.map((p) => {
                    const active = selected?.product_id === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => addProduct(p)}
                        className={`flex w-full items-center justify-between gap-2 rounded-xl border p-2.5 text-left transition ${active ? "border-gold-400 bg-gold-50" : "border-gray-200 hover:border-gold-200"}`}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900">{p.name}</p>
                          <p className="text-xs text-gray-500">{p.sku || "—"} · {formatCurrency(p.sale_price)}</p>
                        </div>
                        <Plus className="h-4 w-4 shrink-0 text-gold-600" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {groupedProducts.length === 0 && <p className="py-6 text-center text-sm text-gray-400">Sin productos</p>}
          </div>
        </div>

        {/* Columna 2: probador 3D */}
        <div className="card-premium p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-semibold text-gray-900">
              <Shirt className="h-5 w-5 text-gold-600" /> Probador Virtual
            </h2>
            <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1">
              {(["hombre", "mujer"] as Gender[]).map((g) => (
                <button
                  key={g}
                  onClick={() => setGender(g)}
                  className={`rounded-lg px-3 py-1 text-sm font-medium capitalize transition ${gender === g ? "bg-white text-gray-900 shadow" : "text-gray-500"}`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200" style={{ height: 420 }}>
            <Mannequin3D
              items={outfitFor3D}
              gender={gender}
              background={background}
              view={view}
              resetNonce={resetNonce}
              height={420}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1">
              {VIEWS.map((v) => (
                <button key={v.key} onClick={() => setView(v.key)} className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${view === v.key ? "border-gold-400 bg-gold-50 text-gray-900" : "border-gray-200 text-gray-600 hover:border-gold-200"}`}>
                  {v.label}
                </button>
              ))}
              <button onClick={() => setResetNonce((n) => n + 1)} title="Reiniciar vista" className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:border-gold-200">
                <RotateCw className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5 text-gray-400" />
              {BACKGROUNDS.map((b) => (
                <button
                  key={b.key}
                  title={b.label}
                  onClick={() => setBackground(b.key)}
                  className={`h-6 w-6 rounded-full border-2 transition ${background === b.key ? "border-gold-500 ring-2 ring-gold-200" : "border-gray-300"}`}
                  style={{ background: b.css }}
                />
              ))}
            </div>
          </div>

          {/* Dotación actual */}
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Dotación actual</h3>
              <span className="text-xs text-gray-400">{outfit.length} prenda(s)</span>
            </div>
            {outfit.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-200 px-3 py-4 text-center text-xs text-gray-400">
                Agrega prendas desde la lista para armar la dotación
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {outfit.map((o) => (
                  <div key={o.key} className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs ${selectedKey === o.key ? "border-gold-400 bg-gold-50" : "border-gray-200"}`}>
                    <button onClick={() => setSelectedKey(o.key)} className="flex items-center gap-1.5">
                      <span className="h-3.5 w-3.5 rounded-full border border-gray-300" style={{ backgroundColor: COLOR_HEX[o.color] || "#c0803a" }} />
                      <span className="max-w-[130px] truncate font-medium text-gray-800">{o.name}</span>
                      <span className="text-gray-500">{o.size}</span>
                    </button>
                    <button onClick={() => removeItem(o)} className="text-gray-400 hover:text-red-600">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Columna 3: información */}
        <div className="space-y-4">
          <div className="card-premium p-4">
            <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
              <Eye className="h-5 w-5 text-gold-600" /> Información
            </h2>
            {selected ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-gold-200 bg-gold-50 px-3 py-2">
                  <p className="text-sm font-medium text-gray-900">{selected.name}</p>
                  <p className="text-xs text-gray-500">
                    {layerLabel(selected.layer)} · {GARMENT_LABELS[selected.type] || "Prenda"} · {formatCurrency(selected.sale_price)}
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 flex items-center gap-1 text-xs font-medium text-gray-500">
                    <Ruler className="h-3.5 w-3.5" /> Talla
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(productMap.get(selected.product_id)?.sizes || [selected.size]).map((s) => (
                      <button
                        key={s}
                        onClick={() => updateSelected({ size: s })}
                        className={`min-w-[2.4rem] rounded-lg border px-2 py-1 text-xs font-semibold transition ${selected.size === s ? "border-gold-500 bg-gold-500 text-white" : "border-gray-200 text-gray-600 hover:border-gold-300"}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 flex items-center gap-1 text-xs font-medium text-gray-500">
                    <Palette className="h-3.5 w-3.5" /> Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {colors.map((c) => (
                      <button
                        key={c}
                        title={c}
                        onClick={() => updateSelected({ color: c })}
                        className={`h-7 w-7 rounded-full border-2 transition ${selected.color === c ? "border-gold-500 ring-2 ring-gold-200" : "border-gray-200"}`}
                        style={{ backgroundColor: COLOR_HEX[c] || "#c0803a" }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={() => saveOutfit.mutate({ single: selected })}
                    disabled={!selectedPersonaId || saveOutfit.isPending}
                    className="btn-gold inline-flex flex-1 items-center justify-center gap-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" /> Guardar talla
                  </button>
                  <button
                    onClick={openQuoteModal}
                    className="btn-gold inline-flex flex-1 items-center justify-center gap-1.5 text-sm"
                  >
                    <FileText className="h-4 w-4" /> Cotizar
                  </button>
                </div>
                {!selectedPersonaId && (
                  <p className="text-center text-xs text-gray-400">Selecciona una persona para guardar su talla</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400">Selecciona una prenda en la dotación para ajustar su talla y color.</p>
            )}

            <button
              onClick={() => saveOutfit.mutate({})}
              disabled={!selectedPersonaId || outfit.length === 0 || saveOutfit.isPending}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gold-300 px-4 py-2 text-sm font-medium text-gold-700 transition hover:bg-gold-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" /> Guardar toda la dotación
            </button>
          </div>

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
                  <button onClick={() => deletePersona.mutate(persona.id)} className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="card-premium p-4">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <Package className="h-4 w-4 text-gold-600" /> Registrar entrega
                </h3>
                <div className="space-y-2">
                  <select value={histForm.product_id} onChange={(e) => setHistForm({ ...histForm, product_id: Number(e.target.value) })} className="input-premium">
                    <option value={0}>Selecciona producto</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <select value={histForm.size} onChange={(e) => setHistForm({ ...histForm, size: e.target.value })} className="input-premium">
                      {(products.find((p) => p.id === histForm.product_id)?.sizes || ["M"]).map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select value={histForm.color} onChange={(e) => setHistForm({ ...histForm, color: e.target.value })} className="input-premium">
                      {colors.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" inputMode="numeric" value={histForm.quantity} onChange={(e) => setHistForm({ ...histForm, quantity: Number(e.target.value) || 1 })} className="input-premium" placeholder="Cantidad" />
                    <input type="date" value={histForm.dotacion_date} onChange={(e) => setHistForm({ ...histForm, dotacion_date: e.target.value })} className="input-premium" />
                  </div>
                  <input value={histForm.note} onChange={(e) => setHistForm({ ...histForm, note: e.target.value })} className="input-premium" placeholder="Nota (opcional)" />
                  <button onClick={() => addHistorial.mutate()} disabled={!histForm.product_id || addHistorial.isPending} className="btn-gold w-full disabled:opacity-50">
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
                  <button onClick={() => deleteEmpresa.mutate(empresaActual.id)} className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <button onClick={() => { setPersonaForm(blankPersona); setShowPersonaModal(true); }} className="btn-gold mt-3 inline-flex w-full items-center justify-center gap-2">
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
                          <p className="text-xs text-gray-500">Talla {r.size}{r.color ? ` · ${r.color}` : ""}</p>
                        </div>
                        <span className="rounded-full bg-gold-100 px-2.5 py-0.5 text-xs font-semibold text-gold-700">{r.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="card-premium p-6">
              <EmptyState icon={Shirt} title="Selecciona una empresa o persona" description="Administra tallas, dotación y prueba las prendas en 3D." />
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
            <form onSubmit={(e) => { e.preventDefault(); createEmpresa.mutate(empresaForm); }} className="space-y-4">
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
                createPersona.mutate({ ...personaForm, company_id: selectedEmpresaId, client_id: null });
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
      {showQuoteModal && selected && (
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
                <p className="text-sm font-medium text-gray-900">{selected.name}</p>
                <p className="text-xs text-gray-500">Talla {selected.size} · {selected.color}</p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Cotización</label>
                <select value={quoteForm.quote_id} onChange={(e) => setQuoteForm({ ...quoteForm, quote_id: Number(e.target.value) })} className="input-premium">
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
                  <input type="text" inputMode="numeric" value={quoteForm.quantity} onChange={(e) => setQuoteForm({ ...quoteForm, quantity: Number(e.target.value) || 1 })} className="input-premium" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Precio unitario</label>
                  <input type="text" inputMode="decimal" value={quoteForm.unit_price} onChange={(e) => setQuoteForm({ ...quoteForm, unit_price: Number(e.target.value) || 0 })} className="input-premium" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowQuoteModal(false)} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
                  Cancelar
                </button>
                <button onClick={() => addToQuote.mutate()} disabled={!quoteForm.quote_id || addToQuote.isPending} className="btn-gold disabled:opacity-50">
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