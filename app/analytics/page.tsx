"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { VideoWithRelations, VideoMetrics, Product } from "@/lib/types";

// ─── types ────────────────────────────────────────────────────────────────────

interface RowMetrics {
  investedValue: string;
  salesValue:    string;
  salesCount:    string;
  impressions:   string;
  reach:         string;
}

interface RowState {
  metrics: RowMetrics;
  saving: boolean;
  saved: boolean;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function toStr(v: number | null | undefined) { return v != null ? String(v) : ""; }
function toNum(s: string) {
  const n = parseFloat(s.replace(",", "."));
  return isNaN(n) || n < 0 ? null : n;
}
function fmtCurrency(n: number | null) {
  if (n === null || !isFinite(n)) return null;
  return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtNum(n: number | null, decimals = 2) {
  if (n === null || !isFinite(n)) return null;
  return n.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function calcMetrics(m: RowMetrics) {
  const invested = toNum(m.investedValue);
  const sales    = toNum(m.salesValue);
  const count    = toNum(m.salesCount);
  const impr     = toNum(m.impressions);
  const reach    = toNum(m.reach);
  const roas     = invested && invested > 0 && sales    != null ? sales / invested    : null;
  const cac      = invested && count    != null && count > 0    ? invested / count    : null;
  const freq     = impr     != null && reach  != null && reach > 0 ? impr / reach    : null;
  return { roas, cac, freq };
}

function roasColor(roas: number | null) {
  if (roas === null) return "text-zinc-500";
  if (roas >= 3)     return "text-emerald-400 font-semibold";
  if (roas >= 1)     return "text-yellow-400";
  return "text-red-400";
}

// ─── Video modal ──────────────────────────────────────────────────────────────

function VideoModal({ fileName, name, onClose }: { fileName: string; name: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col items-center gap-3"
        onClick={(e) => e.stopPropagation()}
        style={{ height: "90vh" }}
      >
        <div className="flex items-center justify-between w-full px-1">
          <p className="text-sm text-zinc-300 font-medium truncate max-w-xs">{name}</p>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors text-lg leading-none ml-4">✕</button>
        </div>
        <video
          src={`/api/stream/${fileName}`}
          controls
          autoPlay
          playsInline
          className="h-full w-auto rounded-lg object-contain"
          style={{ maxWidth: "90vw" }}
        />
      </div>
    </div>
  );
}

// ─── Video thumbnail ──────────────────────────────────────────────────────────

function VideoThumb({ fileName, name }: { fileName: string; name: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        className="relative bg-black rounded overflow-hidden flex-shrink-0 cursor-pointer ring-0 hover:ring-2 hover:ring-blue-500 transition-all"
        style={{ width: 36, height: 64 }}
        onMouseEnter={() => ref.current?.play()}
        onMouseLeave={() => { if (ref.current) { ref.current.pause(); ref.current.currentTime = 0; } }}
        onClick={() => setOpen(true)}
      >
        <video
          ref={ref}
          src={`/api/stream/${fileName}`}
          muted
          playsInline
          preload="metadata"
          className="w-full h-full object-cover"
        />
      </div>
      {open && <VideoModal fileName={fileName} name={name} onClose={() => setOpen(false)} />}
    </>
  );
}

// ─── Product cell ─────────────────────────────────────────────────────────────

function ProductCell({
  videoId,
  linkedIds,
  allProducts,
  onChange,
}: {
  videoId: string;
  linkedIds: Set<string>;
  allProducts: Product[];
  onChange: (videoId: string, next: Set<string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggle = async (productId: string) => {
    const next = new Set(linkedIds);
    if (next.has(productId)) next.delete(productId); else next.add(productId);
    onChange(videoId, next);
    await fetch(`/api/videos/${videoId}/products`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productIds: Array.from(next) }),
    });
  };

  const linked = allProducts.filter((p) => linkedIds.has(p.id));

  return (
    <div className="flex flex-wrap items-center gap-1" ref={ref}>
      {linked.map((p) => (
        <span
          key={p.id}
          className="flex items-center gap-0.5 text-[10px] bg-indigo-900/40 text-indigo-400 border border-indigo-700/30 px-1.5 py-0.5 rounded-full"
        >
          {p.name}
          <button onClick={() => toggle(p.id)} className="hover:text-red-400 leading-none ml-0.5">×</button>
        </span>
      ))}
      {allProducts.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="text-[10px] px-1.5 py-0.5 border border-zinc-700 hover:border-indigo-500 text-zinc-600 hover:text-indigo-400 rounded-full transition-colors"
          >
            +
          </button>
          {open && (
            <div className="absolute left-0 top-5 z-30 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl min-w-[130px] py-1">
              {allProducts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => toggle(p.id)}
                  className={`w-full text-left text-xs px-3 py-1.5 hover:bg-zinc-700 flex items-center gap-2 ${
                    linkedIds.has(p.id) ? "text-indigo-300" : "text-zinc-300"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${linkedIds.has(p.id) ? "bg-indigo-400" : "bg-zinc-600"}`} />
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Cell input ───────────────────────────────────────────────────────────────

function MetricCell({
  value, prefix, onChange, onBlur,
}: {
  value: string;
  prefix?: string;
  onChange: (v: string) => void;
  onBlur: () => void;
}) {
  return (
    <div className="flex items-center">
      {prefix && <span className="text-zinc-600 text-xs mr-0.5 select-none">{prefix}</span>}
      <input
        type="text"
        inputMode="decimal"
        value={value}
        placeholder="—"
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className="w-full bg-transparent text-xs text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:text-white text-right"
      />
    </div>
  );
}

type SortKey = "name" | "investedValue" | "salesValue" | "salesCount" | "impressions" | "reach" | "roas" | "cac" | "freq";
type SortDir = "asc" | "desc";

function SortTh({
  label, sortKey, current, dir, onSort, align = "right", className = "", muted = false,
}: {
  label: string; sortKey: SortKey; current: SortKey | null; dir: SortDir;
  onSort: (k: SortKey) => void; align?: "left" | "right"; className?: string; muted?: boolean;
}) {
  const active = current === sortKey;
  return (
    <th
      className={`px-3 py-3 font-medium cursor-pointer select-none whitespace-nowrap ${className} text-${align} ${
        active ? "text-white" : muted ? "text-zinc-500 hover:text-zinc-300" : "text-zinc-400 hover:text-zinc-200"
      } transition-colors`}
      onClick={() => onSort(sortKey)}
    >
      {label}
      <span className="ml-1 text-[10px] opacity-60">{active ? (dir === "asc" ? "↑" : "↓") : "↕"}</span>
    </th>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [videos, setVideos]   = useState<VideoWithRelations[]>([]);
  const [rows,   setRows]     = useState<Record<string, RowState>>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [productFilter, setProductFilter] = useState<string | null>(null);
  const [linkedProducts, setLinkedProducts] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);

  // fetch once
  useEffect(() => {
    Promise.all([
      fetch("/api/analytics").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
    ]).then(([vData, pData]) => {
      const vids: VideoWithRelations[] = vData.videos ?? [];
      setVideos(vids);
      setProducts(pData.products ?? []);

      // Build initial linked products state
      const initLinked: Record<string, Set<string>> = {};
      for (const v of vids) {
        initLinked[v.id] = new Set((v.products ?? []).map((vp) => vp.product.id));
      }
      setLinkedProducts(initLinked);

      // Build initial row state from saved metrics
      const init: Record<string, RowState> = {};
      for (const v of vids) {
        const m = (v as any).metrics as VideoMetrics | null;
        init[v.id] = {
          metrics: {
            investedValue: toStr(m?.investedValue),
            salesValue:    toStr(m?.salesValue),
            salesCount:    toStr(m?.salesCount),
            impressions:   toStr(m?.impressions),
            reach:         toStr(m?.reach),
          },
          saving: false,
          saved: true,
        };
      }
      setRows(init);
      setLoading(false);
    });
  }, []);

  const updateField = useCallback((videoId: string, field: keyof RowMetrics, value: string) => {
    setRows((prev) => ({
      ...prev,
      [videoId]: { ...prev[videoId], metrics: { ...prev[videoId].metrics, [field]: value }, saved: false },
    }));
  }, []);

  const saveRow = useCallback(async (videoId: string) => {
    const row = rows[videoId];
    if (!row || row.saved) return;

    setRows((prev) => ({ ...prev, [videoId]: { ...prev[videoId], saving: true } }));
    await fetch(`/api/videos/${videoId}/metrics`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        investedValue: toNum(row.metrics.investedValue),
        salesValue:    toNum(row.metrics.salesValue),
        salesCount:    toNum(row.metrics.salesCount),
        impressions:   toNum(row.metrics.impressions),
        reach:         toNum(row.metrics.reach),
      }),
    });
    setRows((prev) => ({ ...prev, [videoId]: { ...prev[videoId], saving: false, saved: true } }));
  }, [rows]);

  const handleProductChange = useCallback((videoId: string, next: Set<string>) => {
    setLinkedProducts((prev) => ({ ...prev, [videoId]: next }));
  }, []);

  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) { setSortDir((d) => d === "asc" ? "desc" : "asc"); return key; }
      setSortDir("desc");
      return key;
    });
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }, []);

  const handleDownloadSelected = useCallback(async () => {
    const ids = Array.from(selected).filter((id) => videos.find((v) => v.id === id)?.status === "EXPORTED");
    if (ids.length === 0) return;
    setDownloading(true);
    ids.forEach((id, i) => {
      setTimeout(() => {
        const a = document.createElement("a");
        a.href = `/api/download/${id}`;
        a.download = "";
        a.click();
      }, i * 600);
    });
    setTimeout(() => setDownloading(false), ids.length * 600 + 500);
  }, [selected, videos]);

  const filtered = useMemo(() => {
    const base = productFilter
      ? videos.filter((v) => linkedProducts[v.id]?.has(productFilter))
      : videos;

    if (!sortKey) return base;

    return [...base].sort((a, b) => {
      let av: number | null = null;
      let bv: number | null = null;

      if (sortKey === "name") {
        const an = a.shortName ?? a.shortNameAuto ?? a.originalName;
        const bn = b.shortName ?? b.shortNameAuto ?? b.originalName;
        return sortDir === "asc" ? an.localeCompare(bn) : bn.localeCompare(an);
      }

      const getCalc = (id: string) => {
        const m = rows[id]?.metrics;
        if (!m) return { roas: null, cac: null, freq: null };
        return calcMetrics(m);
      };

      if (sortKey === "roas") { av = getCalc(a.id).roas; bv = getCalc(b.id).roas; }
      else if (sortKey === "cac") { av = getCalc(a.id).cac; bv = getCalc(b.id).cac; }
      else if (sortKey === "freq") { av = getCalc(a.id).freq; bv = getCalc(b.id).freq; }
      else { av = toNum(rows[a.id]?.metrics[sortKey as keyof RowMetrics] ?? ""); bv = toNum(rows[b.id]?.metrics[sortKey as keyof RowMetrics] ?? ""); }

      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [videos, productFilter, linkedProducts, sortKey, sortDir, rows]);

  // ── totals row ──────────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    let invested = 0, sales = 0, count = 0, impr = 0, reach = 0;
    let investedN = 0, salesN = 0, countN = 0, imprN = 0, reachN = 0;
    for (const v of filtered) {
      const m = rows[v.id]?.metrics;
      if (!m) continue;
      const i = toNum(m.investedValue); if (i != null) { invested += i; investedN++; }
      const s = toNum(m.salesValue);    if (s != null) { sales    += s; salesN++; }
      const c = toNum(m.salesCount);    if (c != null) { count    += c; countN++; }
      const ip = toNum(m.impressions);  if (ip != null) { impr    += ip; imprN++; }
      const r = toNum(m.reach);         if (r != null) { reach    += r; reachN++; }
    }
    const roas = invested > 0 ? sales / invested : null;
    const cac  = count   > 0 ? invested / count  : null;
    const freq = reach   > 0 ? impr    / reach   : null;
    return {
      invested: investedN ? invested : null,
      sales:    salesN    ? sales    : null,
      count:    countN    ? count    : null,
      impr:     imprN     ? impr     : null,
      reach:    reachN    ? reach    : null,
      roas, cac, freq,
    };
  }, [filtered, rows]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-500 flex items-center justify-center text-sm">
        Carregando...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center gap-4 flex-wrap">
        <Link href="/" className="text-zinc-400 hover:text-white transition-colors text-sm">
          ← Dashboard
        </Link>
        <div className="h-4 w-px bg-zinc-700" />
        <h1 className="text-sm font-semibold">Analytics</h1>
        <div className="ml-auto flex items-center gap-3 flex-wrap">
          {selected.size > 0 && (
            <button
              onClick={handleDownloadSelected}
              disabled={downloading}
              className="text-xs px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded transition-colors disabled:opacity-50"
            >
              {downloading ? "Baixando..." : `Baixar selecionados (${selected.size})`}
            </button>
          )}
          <span className="text-xs text-zinc-500">{filtered.length} vídeo(s)</span>
        </div>
      </header>

      {/* Product filter */}
      {products.length > 0 && (
        <div className="px-6 py-3 border-b border-zinc-800 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-zinc-500">Filtrar por produto:</span>
          <button
            onClick={() => setProductFilter(null)}
            className={`text-xs px-3 py-1 rounded-full transition-colors ${
              productFilter === null ? "bg-indigo-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            Todos
          </button>
          {products.map((p) => (
            <button
              key={p.id}
              onClick={() => setProductFilter(productFilter === p.id ? null : p.id)}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${
                productFilter === p.id ? "bg-indigo-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse min-w-[1100px]">
          <thead className="sticky top-0 z-10 bg-zinc-900 border-b border-zinc-800">
            <tr>
              <th className="px-3 py-3 w-8">
                <input
                  type="checkbox"
                  className="accent-indigo-500 h-3.5 w-3.5"
                  checked={selected.size === filtered.length && filtered.length > 0}
                  onChange={(e) => setSelected(e.target.checked ? new Set(filtered.map((v) => v.id)) : new Set())}
                />
              </th>
              <th className="px-2 py-3 w-10"></th>
              <SortTh label="Vídeo" sortKey="name" current={sortKey} dir={sortDir} onSort={handleSort} align="left" className="w-44" />
              <th className="text-left px-3 py-3 text-zinc-400 font-medium w-32">Produto</th>
              <SortTh label="Investido" sortKey="investedValue" current={sortKey} dir={sortDir} onSort={handleSort} className="w-28" />
              <SortTh label="Vl. Vendas" sortKey="salesValue" current={sortKey} dir={sortDir} onSort={handleSort} className="w-28" />
              <SortTh label="Vendas" sortKey="salesCount" current={sortKey} dir={sortDir} onSort={handleSort} className="w-20" />
              <SortTh label="Impressões" sortKey="impressions" current={sortKey} dir={sortDir} onSort={handleSort} className="w-24" />
              <SortTh label="Alcance" sortKey="reach" current={sortKey} dir={sortDir} onSort={handleSort} className="w-24" />
              <SortTh label="ROAS" sortKey="roas" current={sortKey} dir={sortDir} onSort={handleSort} className="w-20" muted />
              <SortTh label="CAC" sortKey="cac" current={sortKey} dir={sortDir} onSort={handleSort} className="w-24" muted />
              <SortTh label="Freq. média" sortKey="freq" current={sortKey} dir={sortDir} onSort={handleSort} className="w-24" muted />
              <th className="text-right px-3 py-3 text-zinc-500 font-medium w-28"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((video) => {
              const row = rows[video.id];
              if (!row) return null;
              const { roas, cac, freq } = calcMetrics(row.metrics);
              const name = video.shortName ?? video.shortNameAuto ?? video.originalName;

              return (
                <tr
                  key={video.id}
                  className="border-b border-zinc-800/60 hover:bg-zinc-900/40 transition-colors group"
                >
                  {/* Checkbox */}
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      className="accent-indigo-500 h-3.5 w-3.5"
                      checked={selected.has(video.id)}
                      onChange={() => toggleSelect(video.id)}
                    />
                  </td>

                  {/* Thumbnail */}
                  <td className="px-2 py-2.5">
                    <VideoThumb fileName={video.fileName} name={name} />
                  </td>

                  {/* Name */}
                  <td className="px-4 py-2.5">
                    <p className="text-zinc-200 font-medium truncate max-w-40" title={name}>{name}</p>
                    <p className="text-zinc-600 truncate max-w-40 text-[10px] mt-0.5">{video.originalName}</p>
                  </td>

                  {/* Products */}
                  <td className="px-3 py-2.5">
                    <ProductCell
                      videoId={video.id}
                      linkedIds={linkedProducts[video.id] ?? new Set()}
                      allProducts={products}
                      onChange={handleProductChange}
                    />
                  </td>

                  {/* Input metrics */}
                  <td className="px-3 py-2.5 bg-zinc-900/20">
                    <MetricCell prefix="R$" value={row.metrics.investedValue}
                      onChange={(v) => updateField(video.id, "investedValue", v)}
                      onBlur={() => saveRow(video.id)} />
                  </td>
                  <td className="px-3 py-2.5 bg-zinc-900/20">
                    <MetricCell prefix="R$" value={row.metrics.salesValue}
                      onChange={(v) => updateField(video.id, "salesValue", v)}
                      onBlur={() => saveRow(video.id)} />
                  </td>
                  <td className="px-3 py-2.5 bg-zinc-900/20">
                    <MetricCell value={row.metrics.salesCount}
                      onChange={(v) => updateField(video.id, "salesCount", v)}
                      onBlur={() => saveRow(video.id)} />
                  </td>
                  <td className="px-3 py-2.5 bg-zinc-900/20">
                    <MetricCell value={row.metrics.impressions}
                      onChange={(v) => updateField(video.id, "impressions", v)}
                      onBlur={() => saveRow(video.id)} />
                  </td>
                  <td className="px-3 py-2.5 bg-zinc-900/20">
                    <MetricCell value={row.metrics.reach}
                      onChange={(v) => updateField(video.id, "reach", v)}
                      onBlur={() => saveRow(video.id)} />
                  </td>

                  {/* Calculated */}
                  <td className={`px-3 py-2.5 text-right ${roasColor(roas)}`}>
                    {fmtNum(roas) ?? <span className="text-zinc-700">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right text-zinc-300">
                    {fmtCurrency(cac) ?? <span className="text-zinc-700">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right text-zinc-300">
                    {fmtNum(freq) ?? <span className="text-zinc-700">—</span>}
                  </td>

                  {/* Actions + save indicator */}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      {row.saving && <span className="text-zinc-600 text-[10px] mr-1">salvando</span>}
                      {!row.saving && !row.saved && <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 mr-1" title="Alterações não salvas" />}
                      <Link
                        href={`/review/${video.id}`}
                        className="opacity-0 group-hover:opacity-100 text-[10px] px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-all"
                      >
                        Editar
                      </Link>
                      {video.status === "EXPORTED" && (
                        <a
                          href={`/api/download/${video.id}`}
                          download
                          className="opacity-0 group-hover:opacity-100 text-[10px] px-2 py-1 bg-emerald-800 hover:bg-emerald-700 text-white rounded transition-all"
                        >
                          Baixar
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={12} className="text-center py-16 text-zinc-600">
                  Nenhum vídeo encontrado.
                </td>
              </tr>
            )}

            {/* Totals row */}
            {filtered.length > 1 && (
              <tr className="border-t-2 border-zinc-700 bg-zinc-900 sticky bottom-0">
                <td className="px-4 py-3 text-zinc-400 font-semibold" colSpan={3}>Total</td>
                <td className="px-3 py-3 text-right text-zinc-300 font-medium">
                  {fmtCurrency(totals.invested) ?? "—"}
                </td>
                <td className="px-3 py-3 text-right text-zinc-300 font-medium">
                  {fmtCurrency(totals.sales) ?? "—"}
                </td>
                <td className="px-3 py-3 text-right text-zinc-300 font-medium">
                  {totals.count != null ? totals.count.toLocaleString("pt-BR") : "—"}
                </td>
                <td className="px-3 py-3 text-right text-zinc-300 font-medium">
                  {totals.impr != null ? totals.impr.toLocaleString("pt-BR") : "—"}
                </td>
                <td className="px-3 py-3 text-right text-zinc-300 font-medium">
                  {totals.reach != null ? totals.reach.toLocaleString("pt-BR") : "—"}
                </td>
                <td className={`px-3 py-3 text-right font-semibold ${roasColor(totals.roas)}`}>
                  {fmtNum(totals.roas) ?? "—"}
                </td>
                <td className="px-3 py-3 text-right text-zinc-300 font-medium">
                  {fmtCurrency(totals.cac) ?? "—"}
                </td>
                <td className="px-3 py-3 text-right text-zinc-300 font-medium">
                  {fmtNum(totals.freq) ?? "—"}
                </td>
                <td />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
