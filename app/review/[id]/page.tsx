"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { SubtitlePreview } from "@/components/SubtitlePreview";
import { SubtitleEditor } from "@/components/SubtitleEditor";
import { StatusBadge } from "@/components/StatusBadge";
import { VideoWithRelations, SegmentData } from "@/lib/types";

export default function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement>(null);
  const [video, setVideo] = useState<VideoWithRelations | null>(null);
  const [segments, setSegments] = useState<SegmentData[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [shortName, setShortName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/videos/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setVideo(data.video);
        setSegments(data.video.segments ?? []);
        setShortName(data.video.shortName ?? data.video.shortNameAuto ?? "");
      });
  }, [id]);

  const handleSegmentChange = useCallback((segId: string, text: string) => {
    setSegments((prev) =>
      prev.map((s) => (s.id === segId ? { ...s, editedText: text } : s))
    );
    setSaved(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (!video) return;
    setSaving(true);

    await Promise.all([
      fetch(`/api/videos/${id}/segments`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segments: segments.map((s) => ({ id: s.id, editedText: s.editedText ?? s.originalText })) }),
      }),
      fetch(`/api/videos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shortName }),
      }),
    ]);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [id, video, segments, shortName]);

  const handleApprove = useCallback(async () => {
    await handleSave();
    await fetch(`/api/videos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "APPROVED" }),
    });
    router.push("/");
  }, [handleSave, id, router]);

  if (!video) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-500">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => router.push("/")}
          className="text-zinc-400 hover:text-white transition-colors text-sm"
        >
          ← Voltar
        </button>
        <div className="flex-1">
          <input
            type="text"
            value={shortName}
            onChange={(e) => { setShortName(e.target.value); setSaved(false); }}
            placeholder="Nome do vídeo (máx. 5 palavras)"
            className="bg-transparent text-white font-semibold text-base focus:outline-none border-b border-transparent focus:border-zinc-500 pb-0.5 w-full max-w-sm"
          />
          <p className="text-xs text-zinc-500 mt-0.5 truncate">{video.originalName}</p>
        </div>
        <StatusBadge status={video.status} />
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs text-green-400">Salvo</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-sm px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded transition-colors disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
          <button
            onClick={handleApprove}
            disabled={saving}
            className="text-sm px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded transition-colors disabled:opacity-50"
          >
            Aprovar
          </button>
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 flex gap-0 overflow-hidden">
        {/* Video player */}
        <div className="flex-1 flex items-center justify-center bg-black relative">
          <div className="relative w-full max-w-2xl aspect-video">
            <video
              ref={videoRef}
              src={`/api/stream/${video.fileName}`}
              controls
              className="w-full h-full"
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            />
            <SubtitlePreview
              currentTime={currentTime}
              segments={segments}
            />
          </div>
        </div>

        {/* Subtitle editor panel */}
        <aside className="w-80 border-l border-zinc-800 bg-zinc-900 p-4 overflow-hidden flex flex-col">
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">
            Legendas ({segments.length} blocos)
          </h2>
          {segments.length === 0 ? (
            <p className="text-zinc-600 text-sm">Nenhuma legenda gerada.</p>
          ) : (
            <SubtitleEditor
              segments={segments}
              currentTime={currentTime}
              onSeek={(t) => {
                if (videoRef.current) videoRef.current.currentTime = t;
              }}
              onChange={handleSegmentChange}
            />
          )}
        </aside>
      </div>
    </div>
  );
}
