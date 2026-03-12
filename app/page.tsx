"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { VideoCard } from "@/components/VideoCard";
import { UploadZone } from "@/components/UploadZone";
import { VideoWithRelations, VideoStatus } from "@/lib/types";

// "Processando" cobre TRANSCRIBING e GENERATING
const PROCESSING_STATUSES = ["TRANSCRIBING", "GENERATING"];

type FilterValue = VideoStatus | "ALL" | "PROCESSING";

const STATUS_FILTERS: { label: string; value: FilterValue }[] = [
  { label: "Todos", value: "ALL" },
  { label: "Aguardando", value: "PENDING" },
  { label: "Processando", value: "PROCESSING" },
  { label: "Para revisão", value: "READY" },
  { label: "Aprovados", value: "APPROVED" },
  { label: "Exportados", value: "EXPORTED" },
  { label: "Erro", value: "ERROR" },
];

export default function Home() {
  const [videos, setVideos] = useState<VideoWithRelations[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<FilterValue>("ALL");
  const [loading, setLoading] = useState(true);

  const fetchVideos = useCallback(async () => {
    // Always fetch ALL from server; filter client-side to avoid race conditions
    const res = await fetch("/api/videos");
    const data = await res.json();
    setVideos(data.videos ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchVideos();
    const interval = setInterval(fetchVideos, 5000);
    return () => clearInterval(interval);
  }, [fetchVideos]);

  const filtered = useMemo(() => {
    if (filter === "ALL") return videos;
    if (filter === "PROCESSING") return videos.filter((v) => PROCESSING_STATUSES.includes(v.status));
    return videos.filter((v) => v.status === filter);
  }, [videos, filter]);

  const handleUploaded = useCallback(async (ids: string[]) => {
    await fetch("/api/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoIds: ids }),
    });
    fetchVideos();
  }, [fetchVideos]);

  const handleApprove = useCallback(async (id: string) => {
    await fetch(`/api/videos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "APPROVED" }),
    });
    fetchVideos();
  }, [fetchVideos]);

  const handleReprocess = useCallback(async (id: string) => {
    await fetch("/api/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoIds: [id] }),
    });
    fetchVideos();
  }, [fetchVideos]);

  const handleBackToEdit = useCallback(async (id: string) => {
    await fetch(`/api/videos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "READY" }),
    });
    fetchVideos();
  }, [fetchVideos]);

  const handleDelete = useCallback(async (id: string) => {
    await fetch(`/api/videos/${id}`, { method: "DELETE" });
    setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
    fetchVideos();
  }, [fetchVideos]);

  const handleDeleteSelected = useCallback(async () => {
    const ids = Array.from(selected);
    if (!confirm(`Excluir ${ids.length} vídeo(s) selecionado(s)? Esta ação não pode ser desfeita.`)) return;
    await Promise.all(ids.map((id) => fetch(`/api/videos/${id}`, { method: "DELETE" })));
    setSelected(new Set());
    fetchVideos();
  }, [selected, fetchVideos]);

  const handleSelect = useCallback((id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelected((prev) =>
      prev.size === filtered.length
        ? new Set()
        : new Set(filtered.map((v) => v.id))
    );
  }, [filtered]);

  const handleExportSelected = useCallback(async () => {
    const ids = Array.from(selected).filter(
      (id) => videos.find((v) => v.id === id)?.status === "APPROVED"
    );
    if (ids.length === 0) return alert("Selecione apenas vídeos aprovados para exportar.");
    await fetch("/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoIds: ids }),
    });
    setSelected(new Set());
    fetchVideos();
  }, [selected, videos, fetchVideos]);

  const handleDownloadSelected = useCallback(() => {
    const exportedIds = Array.from(selected).filter(
      (id) => videos.find((v) => v.id === id)?.status === "EXPORTED"
    );
    if (exportedIds.length === 0) return;
    // Trigger downloads with a small delay to avoid browser blocking
    exportedIds.forEach((id, i) => {
      setTimeout(() => {
        const a = document.createElement("a");
        a.href = `/api/download/${id}`;
        a.download = "";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }, i * 400);
    });
  }, [selected, videos]);

  const selectedVideos = useMemo(
    () => Array.from(selected).map((id) => videos.find((v) => v.id === id)).filter(Boolean) as VideoWithRelations[],
    [selected, videos]
  );
  const hasExportedSelected = selectedVideos.some((v) => v.status === "EXPORTED");
  const hasApprovedSelected = selectedVideos.some((v) => v.status === "APPROVED");

  const approvedCount = videos.filter((v) => v.status === "APPROVED").length;
  const readyCount = videos.filter((v) => v.status === "READY").length;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Edit Stories</h1>
          <p className="text-xs text-zinc-500">Legendagem e exportação em massa</p>
        </div>
        <div className="flex items-center gap-3 text-sm text-zinc-400">
          {readyCount > 0 && <span className="text-yellow-400">{readyCount} para revisar</span>}
          {approvedCount > 0 && <span className="text-green-400">{approvedCount} aprovado(s)</span>}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-6">
        <UploadZone onUploaded={handleUploaded} />

        {videos.length > 0 && (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              {STATUS_FILTERS.map((f) => {
                const count =
                  f.value === "ALL"
                    ? videos.length
                    : f.value === "PROCESSING"
                    ? videos.filter((v) => PROCESSING_STATUSES.includes(v.status)).length
                    : videos.filter((v) => v.status === f.value).length;

                return (
                  <button
                    key={f.value}
                    onClick={() => setFilter(f.value)}
                    className={`text-xs px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5 ${
                      filter === f.value
                        ? "bg-blue-600 text-white"
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                    }`}
                  >
                    {f.label}
                    {count > 0 && (
                      <span className={`text-[10px] rounded-full px-1.5 py-0 ${filter === f.value ? "bg-blue-500" : "bg-zinc-700"}`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Batch actions */}
            <div className="flex gap-2 flex-wrap">
              {filtered.length > 0 && (
                <button
                  onClick={handleSelectAll}
                  className="text-xs px-3 py-1.5 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 rounded transition-colors"
                >
                  {selected.size === filtered.length ? "Desmarcar todos" : "Selecionar todos"}
                </button>
              )}
              {hasApprovedSelected && (
                <button
                  onClick={handleExportSelected}
                  className="text-xs px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white rounded transition-colors"
                >
                  Exportar selecionados ({selectedVideos.filter((v) => v.status === "APPROVED").length})
                </button>
              )}
              {hasExportedSelected && (
                <button
                  onClick={handleDownloadSelected}
                  className="text-xs px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded transition-colors"
                >
                  Baixar selecionados ({selectedVideos.filter((v) => v.status === "EXPORTED").length})
                </button>
              )}
              {selected.size > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  className="text-xs px-3 py-1.5 border border-zinc-700 hover:border-red-500 hover:text-red-400 text-zinc-500 rounded transition-colors"
                >
                  Excluir selecionados ({selected.size})
                </button>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-zinc-500 text-sm">Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-zinc-600 text-sm text-center py-12">
            {videos.length === 0
              ? "Nenhum vídeo ainda. Faça upload para começar."
              : "Nenhum vídeo com este filtro."}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                selected={selected.has(video.id)}
                onSelect={handleSelect}
                onApprove={handleApprove}
                onReprocess={handleReprocess}
                onDelete={handleDelete}
                onBackToEdit={handleBackToEdit}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
