"use client";

import { SegmentData } from "@/lib/types";
import { useCallback } from "react";

interface Props {
  segments: SegmentData[];
  currentTime: number;
  onSeek: (time: number) => void;
  onChange: (id: string, text: string) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${m}:${s.toString().padStart(2, "0")}.${ms}`;
}

export function SubtitleEditor({ segments, currentTime, onSeek, onChange }: Props) {
  const isActive = useCallback(
    (s: SegmentData) => currentTime >= s.startTime && currentTime <= s.endTime,
    [currentTime]
  );

  return (
    <div className="flex flex-col gap-2 overflow-y-auto max-h-[600px] pr-1">
      {segments.map((seg) => {
        const active = isActive(seg);
        const text = seg.editedText ?? seg.originalText;
        const edited = seg.editedText !== null && seg.editedText !== seg.originalText;

        return (
          <div
            key={seg.id}
            className={`rounded-lg border p-3 transition-colors ${
              active
                ? "border-blue-500 bg-blue-950/30"
                : "border-zinc-700 bg-zinc-900"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => onSeek(seg.startTime)}
                className="text-xs text-zinc-500 hover:text-blue-400 transition-colors font-mono"
              >
                {formatTime(seg.startTime)} → {formatTime(seg.endTime)}
              </button>
              {edited && (
                <span className="text-xs text-yellow-400 bg-yellow-950/50 px-1.5 py-0.5 rounded">
                  editado
                </span>
              )}
            </div>
            <textarea
              value={text}
              onChange={(e) => onChange(seg.id, e.target.value)}
              rows={2}
              className="w-full bg-zinc-800 text-white text-sm rounded px-3 py-2 resize-none border border-transparent focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>
        );
      })}
    </div>
  );
}
