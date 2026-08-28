import { useEffect, useRef, useState } from "react";
import type { Client } from "@/api/clients.api";

interface ClientPickerProps {
  clients: Client[];
  value: string;
  onChange: (value: { clientId: number | null; clientName: string }) => void;
}

export function ClientPicker({ clients, value, onChange }: ClientPickerProps) {
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

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.document_number.toLowerCase().includes(query.toLowerCase()) ||
    (c.phone || "").toLowerCase().includes(query.toLowerCase())
  );

  const selectClient = (c: Client) => {
    ignoreBlur.current = true;
    setQuery(c.name);
    setOpen(false);
    onChange({ clientId: c.id, clientName: c.name });
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          onChange({ clientId: null, clientName: e.target.value });
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          if (ignoreBlur.current) {
            ignoreBlur.current = false;
          } else {
            setOpen(false);
          }
        }}
        placeholder="Buscar o escribir nombre del cliente..."
        className="w-full rounded-lg border px-3 py-2 text-sm focus:border-gold-500 focus:outline-none"
        autoComplete="off"
      />
      {open && query.trim().length > 0 && filtered.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border bg-white shadow-lg">
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                selectClient(c);
              }}
              className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-gold-50"
            >
              <span className="font-medium">{c.name}</span>
              <span className="text-xs text-gray-400">
                {c.document_type.toUpperCase()}: {c.document_number}{c.phone ? ` | ${c.phone}` : ""}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
