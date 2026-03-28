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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [videos, setVideos]   = useState<VideoWithRelations[]>([]);
  const [rows,   setRows]     = useState<Record<string, RowState>>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [productFilter, setProductFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // fetch once
  useEffect(() => {
    Promise.all([
      fetch("/api/analytics").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
    ]).then(([vData, pData]) => {
      const vids: VideoWithRelations[] = vData.videos ?? [];
      setVideos(vids);
      setProducts(pData.products ?? []);

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

  const filtered = useMemo(() => {
    if (!productFilter) return videos;
    return videos.filter((v) => v.products?.some((vp) => vp.product.id === productFilter));
  }, [videos, productFilter]);

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
        <div className="ml-auto flex items-center gap-2 flex-wrap">
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
              <th className="px-4 py-3 w-14"></th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium w-48">Vídeo</th>
              <th className="text-left px-3 py-3 text-zinc-400 font-medium w-32">Produto</th>
              {/* inputs */}
              <th className="text-right px-3 py-3 text-zinc-400 font-medium w-28">Investido</th>
              <th className="text-right px-3 py-3 text-zinc-400 font-medium w-28">Vl. Vendas</th>
              <th className="text-right px-3 py-3 text-zinc-400 font-medium w-20">Vendas</th>
              <th className="text-right px-3 py-3 text-zinc-400 font-medium w-24">Impressões</th>
              <th className="text-right px-3 py-3 text-zinc-400 font-medium w-24">Alcance</th>
              {/* calculated */}
              <th className="text-right px-3 py-3 text-zinc-500 font-medium w-20">ROAS</th>
              <th className="text-right px-3 py-3 text-zinc-500 font-medium w-24">CAC</th>
              <th className="text-right px-3 py-3 text-zinc-500 font-medium w-24">Freq. média</th>
              <th className="text-right px-3 py-3 text-zinc-500 font-medium w-12"></th>
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
                  {/* Thumbnail */}
                  <td className="px-4 py-2.5">
                    <VideoThumb fileName={video.fileName} name={name} />
                  </td>

                  {/* Name */}
                  <td className="px-4 py-2.5">
                    <p className="text-zinc-200 font-medium truncate max-w-[180px]" title={name}>{name}</p>
                    <p className="text-zinc-600 truncate max-w-[180px] text-[10px] mt-0.5">{video.originalName}</p>
                  </td>

                  {/* Products */}
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {(video.products ?? []).length > 0 ? (
                        video.products!.map((vp) => (
                          <span key={vp.product.id} className="text-[10px] bg-indigo-900/40 text-indigo-400 px-1.5 py-0.5 rounded-full">
                            {vp.product.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-zinc-700">—</span>
                      )}
                    </div>
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

                  {/* Save indicator */}
                  <td className="px-3 py-2.5 text-right">
                    {row.saving && <span className="text-zinc-600 text-[10px]">salvando</span>}
                    {!row.saving && !row.saved && <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 inline-block" title="Alterações não salvas" />}
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
