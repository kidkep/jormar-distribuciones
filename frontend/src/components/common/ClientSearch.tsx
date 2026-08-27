import { useEffect, useRef, useState } from "react";
import type { Client } from "@/api/clients.api";
import { Search } from "lucide-react";

interface ClientSearchProps {
  clients: Client[];
  value: number | null;
  onChange: (id: number | null) => void;
}

export function ClientSearch({ clients, value, onChange }: ClientSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeClient = clients.find((c) => c.id === value);

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

  const handleSelect = (id: number, name: string) => {
    onChange(id);
    setQuery(name);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={open ? query : (activeClient?.name || query)}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); onChange(null); }}
          onFocus={() => { setQuery(""); setOpen(true); }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Buscar cliente por nombre, documento o telefono..."
          className="w-full rounded-lg border pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          autoComplete="off"
        />
      </div>
      {open && (
        <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border bg-white shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400">Sin resultado. Puede dejar sin cliente.</div>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onMouseDown={() => handleSelect(c.id, c.name)}
                className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-blue-50"
              >
                <span className="font-medium">{c.name}</span>
                <span className="text-xs text-gray-400">
                  {c.document_type.toUpperCase()}: {c.document_number}{c.phone ? ` | ${c.phone}` : ""}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
