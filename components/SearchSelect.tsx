"use client";

import { useEffect, useRef, useState } from "react";

interface Option {
  id: string;
  name: string;
  sub?: string; // optional subtitle (e.g. status)
}

interface Props {
  options: Option[];
  value: string; // selected id
  onChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
}

export function SearchSelect({ options, value, onChange, placeholder = "Selecione...", disabled, loading }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.id === value);

  const filtered = query
    ? options.filter((o) => o.name.toLowerCase().includes(query.toLowerCase()))
    : options;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function select(id: string) {
    onChange(id);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between text-xs px-3 py-2 rounded border transition-colors text-left ${
          disabled || loading
            ? "bg-zinc-800/50 border-zinc-700/50 text-zinc-600 cursor-not-allowed"
            : "bg-zinc-800 border-zinc-700 text-white hover:border-zinc-500 cursor-pointer"
        }`}
      >
        <span className={selected ? "text-white" : "text-zinc-500"}>
          {loading ? "Carregando..." : selected ? selected.name : placeholder}
        </span>
        <span className="text-zinc-500 ml-2">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-zinc-800 border border-zinc-600 rounded shadow-xl">
          {/* Search input */}
          <div className="p-2 border-b border-zinc-700">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar..."
              className="w-full text-xs bg-zinc-700 text-white px-2 py-1.5 rounded border border-zinc-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Options */}
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-xs text-zinc-500 px-3 py-2">Nenhum resultado.</p>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => select(o.id)}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-zinc-700 transition-colors flex items-center justify-between gap-2 ${
                    o.id === value ? "text-blue-400 bg-zinc-700/50" : "text-zinc-200"
                  }`}
                >
                  <span className="truncate">{o.name}</span>
                  {o.sub && (
                    <span className="text-zinc-500 shrink-0">{o.sub}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
