import { useEffect, useRef, useState } from "react";
import type { Supplier } from "@/api/suppliers.api";

interface SupplierPickerProps {
  suppliers: Supplier[];
  value: string;
  onChange: (value: { supplierId: number | null; supplierName: string }) => void;
}

export function SupplierPicker({ suppliers, value, onChange }: SupplierPickerProps) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const ignoreBlur = useRef(false);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.document_number.toLowerCase().includes(query.toLowerCase()) ||
      (s.phone || "").toLowerCase().includes(query.toLowerCase())
  );

  const selectSupplier = (s: Supplier) => {
    ignoreBlur.current = true;
    setQuery(s.name);
    setOpen(false);
    onChange({ supplierId: s.id, supplierName: s.name });
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          onChange({ supplierId: null, supplierName: e.target.value });
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          if (ignoreBlur.current) {
            ignoreBlur.current = false;
          } else {
            setOpen(false);
          }
        }}
        placeholder="Buscar o escribir nombre del proveedor..."
        className="w-full rounded-lg border px-3 py-2 text-sm focus:border-gold-500 focus:outline-none"
        autoComplete="off"
      />
      {open && (
        <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border bg-white shadow-lg">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-400">
              {suppliers.length === 0 ? "No hay proveedores registrados" : "Sin resultados"}
            </p>
          ) : (
            filtered.map((s) => (
              <button
                key={s.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectSupplier(s);
                }}
                className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-gold-50"
              >
                <span className="font-medium">{s.name}</span>
                <span className="text-xs text-gray-400">
                  {s.document_type.toUpperCase()}: {s.document_number}{s.phone ? ` | ${s.phone}` : ""}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
