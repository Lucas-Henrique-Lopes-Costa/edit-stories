"use client";

import { useEffect, useRef, useState } from "react";
import { SegmentData } from "@/lib/types";
import { SUBTITLE_CONFIG } from "@/lib/subtitle-config";

interface Props {
  currentTime: number;
  segments: SegmentData[];
  videoNaturalHeight: number; // real video height in px, for scaling padding/radius
  verticalRatio: number;      // per-video override: 0=top, 1=bottom
  fontSizeRatio: number;      // font size as fraction of video height (e.g. 0.01875)
}

export function SubtitlePreview({ currentTime, segments, videoNaturalHeight, verticalRatio, fontSizeRatio }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);

  // Track the rendered height of the container so we can scale spacing/radius
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      setContainerHeight(entries[0].contentRect.height);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const active = segments.find(
    (s) => currentTime >= s.startTime && currentTime <= s.endTime
  );

  // Font size is a direct fraction of the rendered container height — no external scale needed.
  // Padding and radius also scale with the container so proportions stay consistent.
  const scale = videoNaturalHeight > 0 && containerHeight > 0
    ? containerHeight / videoNaturalHeight
    : containerHeight > 0 ? 1 : 0;

  const fontSize   = fontSizeRatio * containerHeight;
  const paddingX   = SUBTITLE_CONFIG.paddingX   * scale;
  const paddingY   = SUBTITLE_CONFIG.paddingY   * scale;
  const radius     = SUBTITLE_CONFIG.borderRadius * scale;
  const topPercent = verticalRatio * 100;

  return (
    // This wrapper fills the video container so we can measure its height
    <div ref={containerRef} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {active && (
        <div
          style={{
            position: "absolute",
            top: `${topPercent}%`,
            left: "50%",
            transform: "translate(-50%, -50%)",
            maxWidth: `${SUBTITLE_CONFIG.maxWidthPercent}%`,
            backgroundColor: SUBTITLE_CONFIG.backgroundColor,
            color: SUBTITLE_CONFIG.textColor,
            fontFamily: SUBTITLE_CONFIG.fontFamily,
            fontSize: `${fontSize}px`,
            fontWeight: SUBTITLE_CONFIG.fontWeight,
            borderRadius: `${radius}px`,
            padding: `${paddingY}px ${paddingX}px`,
            textAlign: "center",
            lineHeight: 1.4,
            zIndex: 10,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {active.editedText ?? active.originalText}
        </div>
      )}
    </div>
  );
}
