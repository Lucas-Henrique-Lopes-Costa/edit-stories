"use client";

import Link from "next/link";
import { StatusBadge } from "./StatusBadge";
import { VideoWithRelations } from "@/lib/types";

interface Props {
  video: VideoWithRelations;
  selected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onApprove: (id: string) => void;
  onReprocess: (id: string) => void;
  onDelete: (id: string) => void;
  onBackToEdit: (id: string) => void;
}

export function VideoCard({ video, selected, onSelect, onApprove, onReprocess, onDelete, onBackToEdit }: Props) {
  const name = video.shortName ?? video.shortNameAuto ?? video.originalName;
  const canApprove = video.status === "READY";
  const canReprocess = video.status === "ERROR" || video.status === "PENDING";
  const canReview = ["READY", "APPROVED"].includes(video.status);
  const canBackToEdit = ["APPROVED", "EXPORTED"].includes(video.status);
  const exportedJob = video.status === "EXPORTED" ? video.exportJobs?.[0] : null;

  return (
    <div
      className={`bg-zinc-900 border rounded-lg p-4 flex gap-4 items-start transition-colors ${
        selected ? "border-blue-500" : "border-zinc-700 hover:border-zinc-500"
      }`}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={selected}
        onChange={(e) => onSelect(video.id, e.target.checked)}
        className="mt-1 h-4 w-4 rounded accent-blue-500"
      />

      {/* Thumbnail placeholder */}
      <div className="w-24 h-16 bg-zinc-800 rounded flex-shrink-0 flex items-center justify-center text-zinc-600 text-xs">
        VIDEO
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{name}</p>
        <p className="text-xs text-zinc-500 truncate mt-0.5">{video.originalName}</p>
        {video.duration && (
          <p className="text-xs text-zinc-600 mt-0.5">
            {formatDuration(video.duration)}
          </p>
        )}
        <div className="mt-2">
          <StatusBadge status={video.status} />
        </div>
        {video.status === "ERROR" && video.errorMessage && (
          <p className="text-xs text-red-400 mt-1 truncate">{video.errorMessage}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 flex-shrink-0">
        {canReview && (
          <Link
            href={`/review/${video.id}`}
            className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors text-center"
          >
            Revisar
          </Link>
        )}
        {canApprove && (
          <button
            onClick={() => onApprove(video.id)}
            className="text-xs px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white rounded transition-colors"
          >
            Aprovar
          </button>
        )}
        {canReprocess && (
          <button
            onClick={() => onReprocess(video.id)}
            className="text-xs px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white rounded transition-colors"
          >
            Processar
          </button>
        )}
        {canBackToEdit && (
          <button
            onClick={() => onBackToEdit(video.id)}
            className="text-xs px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white rounded transition-colors"
          >
            Reeditar
          </button>
        )}
        {exportedJob?.outputPath && (
          <a
            href={`/api/download/${video.id}`}
            download
            className="text-xs px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded transition-colors text-center"
          >
            Baixar
          </a>
        )}
        <button
          onClick={() => {
            if (confirm(`Excluir "${name}"?`)) onDelete(video.id);
          }}
          className="text-xs px-3 py-1.5 bg-transparent border border-zinc-700 hover:border-red-500 hover:text-red-400 text-zinc-500 rounded transition-colors"
        >
          Excluir
        </button>
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
