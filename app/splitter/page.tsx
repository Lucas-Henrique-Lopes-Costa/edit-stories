"use client";

import { useCallback, useState } from "react";

interface Clip {
  file: string;
  text: string;
  start: number;
  end: number;
}

export default function SplitterPage() {
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [padBefore, setPadBefore] = useState(1);
  const [padAfter, setPadAfter] = useState(1);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("video/") && !/\.(mp4|mov|avi|webm|mkv)$/i.test(file.name)) {
      setError("Selecione um arquivo de vídeo válido.");
      return;
    }
    setError(null);
    setClips([]);
    setJobId(null);
    setProcessing(true);
    setProgress("Enviando vídeo...");

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("padBefore", String(padBefore));
      fd.append("padAfter", String(padAfter));

      setProgress("Processando — detectando falas e transcrevendo...");
      const res = await fetch("/api/splitter/process", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao processar");
      }

      setJobId(data.jobId);
      setClips(data.clips ?? []);
      setProgress(`${data.clips?.length ?? 0} recorte(s) gerado(s).`);
    } catch (e) {
      console.error(e);
      setError((e as Error).message || "Erro inesperado");
      setProgress("");
    } finally {
      setProcessing(false);
    }
  }, [padBefore, padAfter]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const downloadZip = useCallback(() => {
    if (!jobId) return;
    const a = document.createElement("a");
    a.href = `/api/splitter/download?jobId=${jobId}`;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [jobId]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Recortar por falas</h1>
          <p className="text-xs text-zinc-500">Divide um vídeo em clipes baseados em silêncio e nomeia cada recorte com a transcrição.</p>
        </div>
        <div className="flex items-center gap-4 text-sm text-zinc-400">
          <a href="/" className="hover:text-white transition-colors border border-zinc-700 hover:border-zinc-500 px-3 py-1.5 rounded text-xs">
            ← Voltar
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-6">
        <div className="border border-zinc-800 rounded-lg bg-zinc-900 px-4 py-3 flex items-center gap-6">
          <span className="text-xs text-zinc-400">Gap nos recortes:</span>
          <label className="flex items-center gap-2 text-xs text-zinc-300">
            Antes
            <input
              type="number"
              min={0}
              max={10}
              step={0.5}
              value={padBefore}
              onChange={(e) => setPadBefore(Math.max(0, Math.min(10, Number(e.target.value) || 0)))}
              disabled={processing}
              className="w-16 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
            <span className="text-zinc-500">s</span>
          </label>
          <label className="flex items-center gap-2 text-xs text-zinc-300">
            Depois
            <input
              type="number"
              min={0}
              max={10}
              step={0.5}
              value={padAfter}
              onChange={(e) => setPadAfter(Math.max(0, Math.min(10, Number(e.target.value) || 0)))}
              disabled={processing}
              className="w-16 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
            <span className="text-zinc-500">s</span>
          </label>
          <span className="text-xs text-zinc-500 ml-auto">Folga incluída no início e fim de cada recorte</span>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
            dragging ? "border-blue-500 bg-blue-950/20" : "border-zinc-700 hover:border-zinc-500"
          } ${processing ? "opacity-60 pointer-events-none" : ""}`}
        >
          <input
            id="splitter-input"
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <label htmlFor="splitter-input" className="cursor-pointer flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
              <svg className="w-6 h-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.657-1.79 3-4 3s-4-1.343-4-3 1.79-3 4-3 4 1.343 4 3zm12-3c0 1.657-1.79 3-4 3s-4-1.343-4-3 1.79-3 4-3 4 1.343 4 3zM9 10l12-3" />
              </svg>
            </div>
            {processing ? (
              <span className="text-sm text-zinc-400">{progress}</span>
            ) : (
              <>
                <span className="text-sm font-medium text-zinc-300">
                  Arraste um vídeo aqui ou clique para selecionar
                </span>
                <span className="text-xs text-zinc-500">
                  Cada bloco de fala vira um arquivo .mp4 nomeado pela transcrição
                </span>
              </>
            )}
          </label>
        </div>

        {error && (
          <div className="border border-red-900 bg-red-950/30 text-red-300 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {clips.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <div className="text-sm text-zinc-400">
                {clips.length} recorte(s) gerado(s)
              </div>
              <button
                onClick={downloadZip}
                className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
              >
                Baixar ZIP
              </button>
            </div>

            <div className="border border-zinc-800 rounded-lg divide-y divide-zinc-800 bg-zinc-900">
              {clips.map((c, i) => (
                <div key={i} className="px-4 py-3 flex items-start gap-4">
                  <div className="text-xs text-zinc-500 font-mono w-20 shrink-0 pt-0.5">
                    {c.start.toFixed(1)}s → {c.end.toFixed(1)}s
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-zinc-200 truncate" title={c.file}>
                      {c.file}
                    </div>
                    {c.text && (
                      <div className="text-xs text-zinc-500 mt-1 line-clamp-2">{c.text}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
