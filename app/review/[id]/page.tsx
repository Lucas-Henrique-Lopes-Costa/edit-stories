"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { SubtitlePreview } from "@/components/SubtitlePreview";
import { SubtitleEditor } from "@/components/SubtitleEditor";
import { StatusBadge } from "@/components/StatusBadge";
import { SUBTITLE_CONFIG } from "@/lib/subtitle-config";
import { VideoWithRelations, SegmentData } from "@/lib/types";

function formatTime(seconds: number): string {
  if (seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(1);
  return `${m}:${Number(s) < 10 ? "0" : ""}${s}`;
}

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
  // Natural dimensions used for font scaling and container aspect ratio
  const [naturalHeight, setNaturalHeight] = useState(1920);
  const [videoAspectRatio, setVideoAspectRatio] = useState<number | null>(null);
  const [verticalRatio, setVerticalRatio] = useState(SUBTITLE_CONFIG.verticalCenterRatio);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/videos/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setVideo(data.video);
        setSegments(data.video.segments ?? []);
        setShortName(data.video.shortName ?? data.video.shortNameAuto ?? "");
        setVerticalRatio(data.video.subtitlePosition ?? SUBTITLE_CONFIG.verticalCenterRatio);
        setTrimStart(data.video.trimStart ?? 0);
        setTrimEnd(data.video.trimEnd ?? null);
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
    try {
      const [, videoRes] = await Promise.all([
        fetch(`/api/videos/${id}/segments`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            segments: segments.map((s) => ({
              id: s.id,
              editedText: s.editedText ?? s.originalText,
            })),
          }),
        }),
        fetch(`/api/videos/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shortName, subtitlePosition: verticalRatio, trimStart, trimEnd }),
        }),
      ]);

      if (!videoRes.ok) {
        const err = await videoRes.json().catch(() => ({}));
        throw new Error(err.error ?? `HTTP ${videoRes.status}`);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      alert(`Erro ao salvar: ${err instanceof Error ? err.message : err}`);
    } finally {
      setSaving(false);
    }
  }, [id, video, segments, shortName, verticalRatio]);

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
        {/* Video + slider */}
        <div className="flex-1 flex items-center justify-center bg-black p-4 gap-4">

          {/* Vertical position slider */}
          <div className="flex flex-col items-center gap-2 select-none shrink-0">
            <span className="text-zinc-600 text-xs">topo</span>
            <input
              type="range"
              min={10}
              max={95}
              step={1}
              value={Math.round(verticalRatio * 100)}
              onChange={(e) => {
                setVerticalRatio(Number(e.target.value) / 100);
                setSaved(false);
              }}
              className="cursor-pointer"
              style={{
                writingMode: "vertical-lr",
                direction: "rtl",
                height: "280px",
                width: "28px",
                accentColor: "#3b82f6",
              }}
            />
            <span className="text-zinc-600 text-xs">base</span>
            <span className="text-blue-400 text-xs font-mono mt-1">
              {Math.round(verticalRatio * 100)}%
            </span>
          </div>

          {/*
            Container sized to the video's actual display aspect ratio so there
            are no black bars — subtitle CSS top% maps exactly to video frame %.
          */}
          <div
            className="relative bg-black"
            style={{
              aspectRatio: videoAspectRatio
                ? `${Math.round(videoAspectRatio * 1000)} / 1000`
                : "9 / 16",
              height: "calc(100vh - 120px)",
              maxWidth: "100%",
            }}
          >
            <video
              ref={videoRef}
              src={`/api/stream/${video.fileName}`}
              controls
              className="w-full h-full object-fill block"
              onLoadedMetadata={(e) => {
                // Browser already applies rotation metadata, so videoWidth/videoHeight are display dims
                const vw = e.currentTarget.videoWidth;
                const vh = e.currentTarget.videoHeight;
                setNaturalHeight(Math.max(vw, vh));
                setVideoAspectRatio(vw / vh);
              }}
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            />
            <SubtitlePreview
              currentTime={currentTime}
              segments={segments}
              videoNaturalHeight={naturalHeight}
              verticalRatio={verticalRatio}
              fontSizeRatio={SUBTITLE_CONFIG.fontSizeRatio}
            />
          </div>
        </div>

        {/* Subtitle editor panel */}
        <aside className="w-80 border-l border-zinc-800 bg-zinc-900 p-4 overflow-hidden flex flex-col">

          {/* Trim controls */}
          <div className="mb-4 pb-4 border-b border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-300 mb-3">Corte</h2>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-zinc-400 w-10">Início</span>
                <span className="text-xs font-mono text-zinc-300 flex-1">{formatTime(trimStart)}</span>
                <button
                  onClick={() => { setTrimStart(currentTime); setSaved(false); }}
                  className="text-xs px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors"
                  title="Marcar início no tempo atual"
                >
                  ← aqui
                </button>
                <button
                  onClick={() => { setTrimStart(0); setSaved(false); }}
                  className="text-xs text-zinc-600 hover:text-zinc-400"
                  title="Resetar"
                >
                  ✕
                </button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-zinc-400 w-10">Fim</span>
                <span className="text-xs font-mono text-zinc-300 flex-1">{trimEnd !== null ? formatTime(trimEnd) : "—"}</span>
                <button
                  onClick={() => { setTrimEnd(currentTime); setSaved(false); }}
                  className="text-xs px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors"
                  title="Marcar fim no tempo atual"
                >
                  ← aqui
                </button>
                <button
                  onClick={() => { setTrimEnd(null); setSaved(false); }}
                  className="text-xs text-zinc-600 hover:text-zinc-400"
                  title="Resetar"
                >
                  ✕
                </button>
              </div>
              {(trimStart > 0 || trimEnd !== null) && (
                <p className="text-[10px] text-zinc-600 mt-1">
                  Duração: {formatTime((trimEnd ?? video.duration ?? 0) - trimStart)}
                </p>
              )}
            </div>
          </div>

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
