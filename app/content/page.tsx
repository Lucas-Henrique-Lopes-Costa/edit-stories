"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Product, Company, Script } from "@/lib/types";

// ── helpers ──────────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  TO_RECORD: "Para Gravar",
  RECORDING: "Gravando",
  DONE: "Concluído",
};

const FORMAT_LABELS: Record<string, string> = {
  caixinha_pergunta: "Caixinha de Pergunta",
  testemunho: "Testemunho",
  tutorial: "Tutorial",
  antes_depois: "Antes e Depois",
  storytelling: "Storytelling",
};

// ── CompanyModal ──────────────────────────────────────────────────────────────
function CompanyModal({
  company,
  onClose,
  onSaved,
}: {
  company: Company | null;
  onClose: () => void;
  onSaved: (c: Company) => void;
}) {
  const [form, setForm] = useState({
    name: company?.name ?? "",
    description: company?.description ?? "",
    tone: company?.tone ?? "",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const res = await fetch("/api/company", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    onSaved(data.company);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-white mb-4">Informações da Empresa</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Nome da empresa</label>
            <input
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Minha Empresa"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Descrição / O que vende</label>
            <textarea
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none"
              rows={3}
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Ex: Loja de suplementos focada em emagrecimento..."
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Tom de comunicação</label>
            <input
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              value={form.tone ?? ""}
              onChange={(e) => setForm({ ...form, tone: e.target.value })}
              placeholder="Ex: Descontraído, direto, próximo do cliente"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="text-sm px-4 py-2 text-zinc-400 hover:text-white transition-colors">Cancelar</button>
          <button
            onClick={save}
            disabled={saving}
            className="text-sm px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded transition-colors disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ProductModal ──────────────────────────────────────────────────────────────
function ProductModal({
  product,
  onClose,
  onSaved,
}: {
  product: Product;
  onClose: () => void;
  onSaved: (p: Product) => void;
}) {
  const [form, setForm] = useState({
    description: product.description ?? "",
    benefits: product.benefits ?? "",
    targetAudience: product.targetAudience ?? "",
    price: product.price ?? "",
    objections: product.objections ?? "",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const res = await fetch(`/api/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    onSaved(data.product);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-white mb-1">Detalhes do Produto</h2>
        <p className="text-sm text-zinc-400 mb-4">{product.name}</p>
        <div className="space-y-3">
          {[
            { key: "description", label: "Descrição", placeholder: "O que é o produto, como funciona..." },
            { key: "benefits", label: "Benefícios principais", placeholder: "Emagrece rápido, sem efeito rebote..." },
            { key: "targetAudience", label: "Público-alvo", placeholder: "Mulheres 25-45 anos que querem emagrecer..." },
            { key: "price", label: "Preço / Oferta", placeholder: "R$ 97,00 ou 3x de R$ 34,90..." },
            { key: "objections", label: "Objeções comuns", placeholder: "Já tentei de tudo, não funciona para mim..." },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="text-xs text-zinc-400 mb-1 block">{label}</label>
              <textarea
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none"
                rows={2}
                value={(form as Record<string, string>)[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                placeholder={placeholder}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="text-sm px-4 py-2 text-zinc-400 hover:text-white transition-colors">Cancelar</button>
          <button
            onClick={save}
            disabled={saving}
            className="text-sm px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded transition-colors disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ScriptCard ────────────────────────────────────────────────────────────────
function ScriptCard({
  script,
  onUpdated,
  onDeleted,
}: {
  script: Script;
  onUpdated: (s: Script) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(script.content);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const dropInputRef = useRef<HTMLInputElement>(null);

  const save = async () => {
    setSaving(true);
    const res = await fetch(`/api/scripts/${script.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    const data = await res.json();
    onUpdated(data.script);
    setSaving(false);
    setEditing(false);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(script.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const del = async () => {
    if (!confirm("Excluir este roteiro?")) return;
    await fetch(`/api/scripts/${script.id}`, { method: "DELETE" });
    onDeleted(script.id);
  };

  const changeStatus = async (status: string) => {
    const res = await fetch(`/api/scripts/${script.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    onUpdated(data.script);
  };

  const handleVideoDrop = async (file: File) => {
    setUploading(true);
    setDragOver(false);

    // 1. Upload the video
    const form = new FormData();
    form.append("videos", file);
    const upRes = await fetch("/api/upload", { method: "POST", body: form });
    const upData = await upRes.json();
    const videoId: string = upData.videos?.[0]?.id;
    if (!videoId) { setUploading(false); return; }

    // 2. Trigger processing (transcription + subtitle generation)
    await fetch("/api/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoIds: [videoId] }),
    });

    // 3. Link video to this script
    await fetch(`/api/scripts/${script.id}/attach`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId }),
    });

    // 4. Go to review page
    window.location.href = `/review/${videoId}`;
  };

  const videoName = script.video
    ? script.video.shortName ?? script.video.shortNameAuto ?? script.video.originalName
    : null;

  return (
    <div
      className={`bg-zinc-900 border rounded-xl p-4 flex flex-col gap-3 transition-colors ${
        dragOver ? "border-indigo-500 bg-indigo-950/20" : "border-zinc-700 hover:border-zinc-600"
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleVideoDrop(f); }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1.5 items-center">
          {script.product && (
            <span className="text-[10px] bg-indigo-900/60 text-indigo-300 border border-indigo-700/50 px-2 py-0.5 rounded-full">
              {script.product.name}
            </span>
          )}
          {script.format && FORMAT_LABELS[script.format] && (
            <span className="text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700 px-2 py-0.5 rounded-full">
              {FORMAT_LABELS[script.format]}
            </span>
          )}
          <select
            value={script.status}
            onChange={(e) => changeStatus(e.target.value)}
            className="text-[10px] bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-full px-2 py-0.5 focus:outline-none cursor-pointer"
          >
            {Object.entries(STATUS_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={copy}
            className="text-xs px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors"
          >
            {copied ? "✓" : "Copiar"}
          </button>
          <button
            onClick={() => setEditing((v) => !v)}
            className="text-xs px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors"
          >
            {editing ? "Cancelar" : "Editar"}
          </button>
          <button
            onClick={del}
            className="text-xs px-2 py-1 bg-transparent hover:text-red-400 text-zinc-600 rounded transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Prompt hint */}
      <p className="text-[11px] text-zinc-600 italic line-clamp-1">"{script.prompt}"</p>

      {/* Content */}
      {editing ? (
        <div className="flex flex-col gap-2">
          <textarea
            className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none"
            rows={10}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <button
            onClick={save}
            disabled={saving}
            className="self-end text-sm px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded transition-colors disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      ) : (
        <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{script.content}</p>
      )}

      {/* Video drop zone / attached video */}
      <div className="border-t border-zinc-800 pt-2">
        {videoName ? (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500">Vídeo gravado:</span>
            <Link
              href={`/review/${script.video!.id}`}
              className="text-[10px] text-indigo-400 hover:text-indigo-300 truncate flex-1"
            >
              {videoName}
            </Link>
            <Link
              href={`/review/${script.video!.id}`}
              className="text-[10px] px-2 py-0.5 bg-indigo-700 hover:bg-indigo-600 text-white rounded transition-colors shrink-0"
            >
              Editar
            </Link>
          </div>
        ) : (
          <div
            onClick={() => dropInputRef.current?.click()}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed cursor-pointer transition-colors ${
              dragOver
                ? "border-indigo-400 bg-indigo-900/20 text-indigo-300"
                : "border-zinc-700 hover:border-zinc-500 text-zinc-600 hover:text-zinc-400"
            }`}
          >
            <span className="text-base leading-none">↓</span>
            <p className="text-[11px]">
              {uploading
                ? "Enviando e iniciando edição..."
                : dragOver
                ? "Solte para iniciar edição"
                : "Arraste o vídeo gravado aqui para ir direto para a edição"}
            </p>
            <input
              ref={dropInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVideoDrop(f); }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ContentPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);

  // Generation form
  const [prompt, setPrompt] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Reference video upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [refVideoId, setRefVideoId] = useState<string | null>(null);
  const [refVideoName, setRefVideoName] = useState<string | null>(null);
  const [refStatus, setRefStatus] = useState<"idle" | "uploading" | "processing" | "ready" | "error">("idle");

  // Poll reference video until transcription exists
  const startPolling = useCallback((videoId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/videos/${videoId}`);
      const data = await res.json();
      const v = data.video;
      if (v?.transcription) {
        clearInterval(pollRef.current!);
        setRefStatus("ready");
      } else if (v?.status === "ERROR") {
        clearInterval(pollRef.current!);
        setRefStatus("error");
      }
    }, 2500);
  }, []);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const handleRefUpload = useCallback(async (file: File) => {
    setRefStatus("uploading");
    setRefVideoId(null);
    setRefVideoName(file.name);

    const form = new FormData();
    form.append("videos", file);
    const upRes = await fetch("/api/upload", { method: "POST", body: form });
    const upData = await upRes.json();
    const videoId: string = upData.videos?.[0]?.id;
    if (!videoId) { setRefStatus("error"); return; }

    setRefVideoId(videoId);
    setRefStatus("processing");

    // Trigger processing
    await fetch("/api/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoIds: [videoId] }),
    });

    startPolling(videoId);
  }, [startPolling]);

  const clearRefVideo = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    setRefVideoId(null);
    setRefVideoName(null);
    setRefStatus("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [productFilter, setProductFilter] = useState<string>("ALL");

  // Modals
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const loadData = useCallback(async () => {
    const [productsRes, companyRes, scriptsRes] = await Promise.all([
      fetch("/api/products"),
      fetch("/api/company"),
      fetch("/api/scripts"),
    ]);
    const [pd, cd, sd] = await Promise.all([productsRes.json(), companyRes.json(), scriptsRes.json()]);
    setProducts(pd.products ?? []);
    setCompany(cd.company ?? null);
    setScripts(sd.scripts ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const generate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch("/api/scripts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          productId: selectedProductId || null,
          quantity,
          referenceVideoId: refVideoId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao gerar");
      setScripts((prev) => [...data.scripts, ...prev]);
      setPrompt("");
    } catch (e: unknown) {
      setGenError(e instanceof Error ? e.message : "Erro ao gerar roteiros");
    } finally {
      setGenerating(false);
    }
  };

  const filteredScripts = scripts.filter((s) => {
    if (statusFilter !== "ALL" && s.status !== statusFilter) return false;
    if (productFilter !== "ALL" && s.productId !== productFilter) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-500 text-sm">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-zinc-400 hover:text-white text-sm transition-colors">← Dashboard</Link>
          <h1 className="text-lg font-semibold">Criação de Conteúdo</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCompanyModal(true)}
            className="text-sm px-3 py-1.5 border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white rounded transition-colors"
          >
            {company?.name ? company.name : "Empresa"}
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Generation Panel */}
        <section className="bg-zinc-900 border border-zinc-700 rounded-xl p-6">
          <h2 className="text-base font-semibold mb-4">Gerar Roteiros com IA</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="text-xs text-zinc-400 mb-1 block">O que você quer criar?</label>
              <textarea
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none"
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ex: Quero produzir vídeos de caixinha de pergunta para o Diurex mostrando resultados reais..."
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate(); }}
              />
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Produto</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Sem produto específico</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {selectedProductId && (
                  <button
                    onClick={() => setEditingProduct(products.find((p) => p.id === selectedProductId) ?? null)}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 mt-1 transition-colors"
                  >
                    Editar detalhes do produto
                  </button>
                )}
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Quantidade</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Reference video upload */}
          <div className="mb-4">
            <label className="text-xs text-zinc-400 mb-1 block">Vídeo de referência <span className="text-zinc-600">(opcional)</span></label>
            {refStatus === "idle" ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) handleRefUpload(file);
                }}
                className="flex items-center gap-3 px-4 py-3 border border-dashed border-zinc-700 hover:border-indigo-500 rounded-lg cursor-pointer transition-colors group"
              >
                <span className="text-zinc-600 group-hover:text-indigo-400 text-lg transition-colors">↑</span>
                <p className="text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors">
                  Clique ou arraste um vídeo semelhante ao que quer criar — vamos transcrever e usar como referência
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleRefUpload(f); }}
                />
              </div>
            ) : (
              <div className="flex items-center gap-3 px-4 py-3 border border-zinc-700 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-300 truncate">{refVideoName}</p>
                  <p className="text-[10px] mt-0.5">
                    {refStatus === "uploading" && <span className="text-zinc-500">Enviando...</span>}
                    {refStatus === "processing" && <span className="text-blue-400 animate-pulse">Transcrevendo...</span>}
                    {refStatus === "ready" && <span className="text-green-400">Transcrição pronta — será usada como referência</span>}
                    {refStatus === "error" && <span className="text-red-400">Erro ao processar vídeo</span>}
                  </p>
                </div>
                <button
                  onClick={clearRefVideo}
                  className="text-zinc-600 hover:text-zinc-300 text-sm transition-colors shrink-0"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {genError && <p className="text-sm text-red-400 mb-3">{genError}</p>}

          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-600">Usa GPT-4o · Contexto: empresa, produto, melhores criativos{refStatus === "ready" ? " e vídeo de referência" : ""}</p>
            <button
              onClick={generate}
              disabled={generating || !prompt.trim()}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? "Gerando..." : `Gerar ${quantity > 1 ? `${quantity} roteiros` : "roteiro"}`}
            </button>
          </div>
        </section>

        {/* Product Details Quick Access */}
        {products.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-zinc-400 mb-2">Detalhes dos produtos</h2>
            <div className="flex flex-wrap gap-2">
              {products.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setEditingProduct(p)}
                  className="text-xs px-3 py-1.5 border border-zinc-700 hover:border-indigo-500 text-zinc-400 hover:text-indigo-300 rounded-full transition-colors"
                >
                  {p.name}
                  {(p.description || p.benefits) && (
                    <span className="ml-1 text-green-500">●</span>
                  )}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Scripts List */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">
              Roteiros
              {filteredScripts.length > 0 && (
                <span className="ml-2 text-sm font-normal text-zinc-500">({filteredScripts.length})</span>
              )}
            </h2>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 rounded px-2 py-1.5 focus:outline-none"
              >
                <option value="ALL">Todos os status</option>
                {Object.entries(STATUS_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
              <select
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 rounded px-2 py-1.5 focus:outline-none"
              >
                <option value="ALL">Todos os produtos</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {filteredScripts.length === 0 ? (
            <div className="text-center py-16 text-zinc-600">
              <p className="text-sm">Nenhum roteiro encontrado.</p>
              <p className="text-xs mt-1">Use o painel acima para gerar roteiros com IA.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredScripts.map((s) => (
                <ScriptCard
                  key={s.id}
                  script={s}
                  onUpdated={(updated) => setScripts((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))}
                  onDeleted={(id) => setScripts((prev) => prev.filter((x) => x.id !== id))}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Modals */}
      {showCompanyModal && (
        <CompanyModal
          company={company}
          onClose={() => setShowCompanyModal(false)}
          onSaved={(c) => setCompany(c)}
        />
      )}
      {editingProduct && (
        <ProductModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSaved={(updated) => {
            setProducts((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
            setEditingProduct(null);
          }}
        />
      )}
    </div>
  );
}
