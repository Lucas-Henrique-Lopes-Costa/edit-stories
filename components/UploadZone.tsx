"use client";

import { useCallback, useState } from "react";

interface Props {
  onUploaded: (videoIds: string[]) => void;
}

export function UploadZone({ onUploaded }: Props) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string>("");

  const upload = useCallback(
    async (files: FileList | File[]) => {
      const videoFiles = Array.from(files).filter((f) =>
        f.type.startsWith("video/")
      );
      if (videoFiles.length === 0) return;

      setUploading(true);
      setProgress(`Enviando ${videoFiles.length} vídeo(s)...`);

      try {
        const formData = new FormData();
        videoFiles.forEach((f) => formData.append("videos", f));

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Upload failed");
        const data = await res.json();
        const ids = data.videos.map((v: { id: string }) => v.id);
        onUploaded(ids);
        setProgress(`${ids.length} vídeo(s) enviado(s).`);
      } catch (err) {
        setProgress("Erro no upload. Tente novamente.");
        console.error(err);
      } finally {
        setUploading(false);
      }
    },
    [onUploaded]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      upload(e.dataTransfer.files);
    },
    [upload]
  );

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
        dragging ? "border-blue-500 bg-blue-950/20" : "border-zinc-700 hover:border-zinc-500"
      }`}
    >
      <input
        id="file-input"
        type="file"
        accept="video/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && upload(e.target.files)}
      />
      <label
        htmlFor="file-input"
        className="cursor-pointer flex flex-col items-center gap-3"
      >
        <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
          <svg className="w-6 h-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        {uploading ? (
          <span className="text-sm text-zinc-400">{progress}</span>
        ) : (
          <>
            <span className="text-sm font-medium text-zinc-300">
              Arraste vídeos aqui ou clique para selecionar
            </span>
            <span className="text-xs text-zinc-500">
              MP4, MOV, AVI, WEBM — múltiplos arquivos suportados
            </span>
          </>
        )}
      </label>
    </div>
  );
}
