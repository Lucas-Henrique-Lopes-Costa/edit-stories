"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { StatusBadge } from "./StatusBadge";
import { VideoWithRelations, Product } from "@/lib/types";

interface Props {
  video: VideoWithRelations;
  selected: boolean;
  allProducts: Product[];
  onSelect: (id: string, checked: boolean) => void;
  onApprove: (id: string) => void;
  onReprocess: (id: string) => void;
  onDelete: (id: string) => void;
  onBackToEdit: (id: string) => void;
  onExport: (id: string) => void;
  onProductsChanged: () => void;
}

export function VideoCard({
  video, selected, allProducts,
  onSelect, onApprove, onReprocess, onDelete, onBackToEdit, onExport, onProductsChanged,
}: Props) {
  const name = video.shortName ?? video.shortNameAuto ?? video.originalName;
  const canApprove    = video.status === "READY";
  const canExport     = video.status === "APPROVED";
  const canReprocess  = video.status === "ERROR" || video.status === "PENDING";
  const canReview     = ["READY", "APPROVED"].includes(video.status);
  const canBackToEdit = ["APPROVED", "EXPORTED", "EXPORTING"].includes(video.status);
  const exportedJob   = video.status === "EXPORTED" ? video.exportJobs?.[0] : null;

  const [linkedIds, setLinkedIds] = useState<Set<string>>(
    () => new Set((video.products ?? []).map((vp) => vp.product.id))
  );
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync if video.products changes (re-fetch from parent)
  useEffect(() => {
    setLinkedIds(new Set((video.products ?? []).map((vp) => vp.product.id)));
  }, [video.products]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return;
    const handler = (e: MouseEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDropdown]);

  const toggleProduct = async (productId: string) => {
    const next = new Set(linkedIds);
    if (next.has(productId)) next.delete(productId); else next.add(productId);
    setLinkedIds(next);
    await fetch(`/api/videos/${video.id}/products`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productIds: Array.from(next) }),
    });
    onProductsChanged();
  };

  const linkedProducts = allProducts.filter((p) => linkedIds.has(p.id));

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
          <p className="text-xs text-zinc-600 mt-0.5">{formatDuration(video.duration)}</p>
        )}
        <div className="mt-2">
          <StatusBadge status={video.status} />
        </div>
        {video.status === "ERROR" && video.errorMessage && (
          <p className="text-xs text-red-400 mt-1 truncate">{video.errorMessage}</p>
        )}

        {/* Products row */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2" ref={dropdownRef}>
          {linkedProducts.map((p) => (
            <span
              key={p.id}
              className="flex items-center gap-1 text-[10px] bg-indigo-900/60 text-indigo-300 border border-indigo-700/50 px-2 py-0.5 rounded-full"
            >
              {p.name}
              <button
                onClick={() => toggleProduct(p.id)}
                className="hover:text-red-400 leading-none"
              >
                ×
              </button>
            </span>
          ))}
          {allProducts.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowDropdown((v) => !v)}
                className="text-[10px] px-2 py-0.5 border border-zinc-700 hover:border-indigo-500 text-zinc-500 hover:text-indigo-400 rounded-full transition-colors"
              >
                + produto
              </button>
              {showDropdown && (
                <div className="absolute left-0 top-6 z-20 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl min-w-[140px] py-1">
                  {allProducts.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => toggleProduct(p.id)}
                      className={`w-full text-left text-xs px-3 py-1.5 hover:bg-zinc-700 transition-colors flex items-center gap-2 ${
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
        {canExport && (
          <button
            onClick={() => onExport(video.id)}
            className="text-xs px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded transition-colors"
          >
            Exportar
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
          onClick={() => { if (confirm(`Excluir "${name}"?`)) onDelete(video.id); }}
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
