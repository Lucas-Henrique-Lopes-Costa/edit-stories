"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { VideoWithRelations, VideoMetrics } from "@/lib/types";

interface MetricsForm {
  investedValue: string;
  salesValue:    string;
  salesCount:    string;
  impressions:   string;
  reach:         string;
}

const EMPTY: MetricsForm = {
  investedValue: "",
  salesValue:    "",
  salesCount:    "",
  impressions:   "",
  reach:         "",
};

function num(v: string) {
  const n = parseFloat(v.replace(",", "."));
  return isNaN(n) || n < 0 ? null : n;
}

function fmt(n: number | null, style: "currency" | "decimal" | "percent" = "decimal", decimals = 2) {
  if (n === null || !isFinite(n)) return "—";
  if (style === "currency") return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return n.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export default function AnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [video, setVideo] = useState<VideoWithRelations | null>(null);
  const [form, setForm] = useState<MetricsForm>(EMPTY);
  const [saved, setSaved] = useState(true);
  const [saving, setSaving] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/videos/${id}`).then((r) => r.json()),
      fetch(`/api/videos/${id}/metrics`).then((r) => r.json()),
    ]).then(([vData, mData]) => {
      setVideo(vData.video);
      const m: VideoMetrics | null = mData.metrics;
      if (m) {
        setForm({
          investedValue: m.investedValue != null ? String(m.investedValue) : "",
          salesValue:    m.salesValue    != null ? String(m.salesValue)    : "",
          salesCount:    m.salesCount    != null ? String(m.salesCount)    : "",
          impressions:   m.impressions   != null ? String(m.impressions)   : "",
          reach:         m.reach         != null ? String(m.reach)         : "",
        });
      }
    });
  }, [id]);

  const handleChange = (field: keyof MetricsForm, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await fetch(`/api/videos/${id}/metrics`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        investedValue: num(form.investedValue),
        salesValue:    num(form.salesValue),
        salesCount:    num(form.salesCount),
        impressions:   num(form.impressions),
        reach:         num(form.reach),
      }),
    });
    setSaved(true);
    setSaving(false);
  };

  // Calculated metrics
  const invested = num(form.investedValue);
  const sales    = num(form.salesValue);
  const count    = num(form.salesCount);
  const impr     = num(form.impressions);
  const reach    = num(form.reach);

  const roas     = invested && invested > 0 && sales    != null ? sales / invested : null;
  const cac      = invested && count   != null && count > 0      ? invested / count : null;
  const freqMedia = impr    != null && reach  != null && reach > 0 ? impr / reach    : null;

  if (!video) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-500 flex items-center justify-center text-sm">
        Carregando...
      </div>
    );
  }

  const videoName = video.shortName ?? video.shortNameAuto ?? video.originalName;

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="text-zinc-400 hover:text-white transition-colors text-sm"
        >
          ← Voltar
        </button>
        <div className="h-4 w-px bg-zinc-700" />
        <div>
          <h1 className="text-sm font-semibold">{videoName}</h1>
          <p className="text-xs text-zinc-500">Analytics</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {!saved && (
            <span className="text-xs text-yellow-500">Alterações não salvas</span>
          )}
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className="text-sm px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded transition-colors"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 gap-0 overflow-hidden">
        {/* Left — video preview */}
        <div className="w-72 flex-shrink-0 border-r border-zinc-800 flex flex-col items-center p-6 gap-4">
          <div
            className="relative bg-black rounded-lg overflow-hidden w-full"
            style={{ aspectRatio: "9 / 16" }}
          >
            <video
              ref={videoRef}
              src={`/api/stream/${video.fileName}`}
              controls
              className="w-full h-full object-contain"
            />
          </div>
          <div className="text-center">
            <p className="text-xs font-medium text-zinc-300 truncate max-w-full">{videoName}</p>
            {video.duration && (
              <p className="text-xs text-zinc-600 mt-0.5">{Math.floor(video.duration / 60)}:{String(Math.floor(video.duration % 60)).padStart(2, "0")}</p>
            )}
            {/* Product tags */}
            {(video.products ?? []).length > 0 && (
              <div className="flex flex-wrap justify-center gap-1 mt-2">
                {video.products!.map((vp) => (
                  <span key={vp.product.id} className="text-[10px] bg-indigo-900/50 text-indigo-300 border border-indigo-700/40 px-2 py-0.5 rounded-full">
                    {vp.product.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right — metrics */}
        <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-8 max-w-3xl">

          {/* Calculated KPIs */}
          <section>
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
              Métricas calculadas
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <KpiCard
                label="ROAS"
                value={roas !== null ? fmt(roas, "decimal", 2) : "—"}
                description="Retorno sobre investimento em vendas"
                color={roas === null ? "neutral" : roas >= 3 ? "green" : roas >= 1 ? "yellow" : "red"}
                formula="Vendas / Investido"
              />
              <KpiCard
                label="CAC"
                value={cac !== null ? fmt(cac, "currency") : "—"}
                description="Custo de aquisição por cliente"
                color="neutral"
                formula="Investido / Vendas"
              />
              <KpiCard
                label="Freq. média"
                value={freqMedia !== null ? fmt(freqMedia, "decimal", 2) : "—"}
                description="Impressões por pessoa alcançada"
                color="neutral"
                formula="Impressões / Alcance"
              />
            </div>
          </section>

          {/* Manual input */}
          <section>
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
              Dados de desempenho
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <MetricInput
                label="Valor investido"
                prefix="R$"
                placeholder="0,00"
                value={form.investedValue}
                onChange={(v) => handleChange("investedValue", v)}
              />
              <MetricInput
                label="Valor de vendas"
                prefix="R$"
                placeholder="0,00"
                value={form.salesValue}
                onChange={(v) => handleChange("salesValue", v)}
              />
              <MetricInput
                label="Vendas"
                placeholder="0"
                value={form.salesCount}
                onChange={(v) => handleChange("salesCount", v)}
              />
              <MetricInput
                label="Impressões"
                placeholder="0"
                value={form.impressions}
                onChange={(v) => handleChange("impressions", v)}
              />
              <MetricInput
                label="Alcance"
                placeholder="0"
                value={form.reach}
                onChange={(v) => handleChange("reach", v)}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label, value, description, color, formula,
}: {
  label: string;
  value: string;
  description: string;
  color: "green" | "yellow" | "red" | "neutral";
  formula: string;
}) {
  const colorMap = {
    green:   "text-emerald-400",
    yellow:  "text-yellow-400",
    red:     "text-red-400",
    neutral: "text-white",
  };
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-1">
      <span className="text-xs text-zinc-500 font-medium">{label}</span>
      <span className={`text-2xl font-bold tracking-tight ${colorMap[color]}`}>{value}</span>
      <span className="text-[10px] text-zinc-600 mt-auto">{formula}</span>
    </div>
  );
}

function MetricInput({
  label, prefix, placeholder, value, onChange,
}: {
  label: string;
  prefix?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-zinc-400 font-medium">{label}</label>
      <div className="flex items-center bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden focus-within:border-blue-500 transition-colors">
        {prefix && (
          <span className="text-xs text-zinc-500 pl-3 pr-1 select-none">{prefix}</span>
        )}
        <input
          type="text"
          inputMode="decimal"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent text-sm text-white px-3 py-2.5 focus:outline-none placeholder:text-zinc-700"
        />
      </div>
    </div>
  );
}
