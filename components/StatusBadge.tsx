"use client";

import { VideoStatus, STATUS_LABELS, STATUS_COLORS } from "@/lib/types";

export function StatusBadge({ status }: { status: string }) {
  const s = status as VideoStatus;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        STATUS_COLORS[s] ?? "bg-zinc-700 text-zinc-300"
      }`}
    >
      {STATUS_LABELS[s] ?? status}
    </span>
  );
}
